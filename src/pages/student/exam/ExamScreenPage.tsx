import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, Send } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { examsService } from '@/services/exams.service';
import type { ExamQuestion, OptionKey } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function formatTimeTaken(totalSeconds: number, remaining: number): string {
  const taken = Math.max(totalSeconds - remaining, 0);
  const mins = Math.floor(taken / 60);
  const secs = taken % 60;
  return `${mins}m ${secs}s`;
}

const OPTION_KEYS: OptionKey[] = ['a', 'b', 'c', 'd'];
const OPTION_LABELS: Record<OptionKey, string> = { a: 'A', b: 'B', c: 'C', d: 'D' };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExamScreenPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const sId = Number(sessionId);

  // State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Map<number, OptionKey | null>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [showCheatWarning, setShowCheatWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);

  // Refs for cleanup
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);

  // -----------------------------------------------------------------------
  // Fetch session
  // -----------------------------------------------------------------------

  const { data: session, isLoading, isError } = useQuery({
    queryKey: ['exam-session', sId],
    queryFn: () => examsService.getSession(sId),
    enabled: !!sessionId,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  // Initialize local state from session
  useEffect(() => {
    if (!session) return;

    // If the attempt is already locked (submitted or further along the
    // lifecycle), redirect — it can never be re-entered.
    if (['submitted', 'evaluated', 'published', 'abandoned'].includes(session.status)) {
      navigate('/student/exam/complete', { replace: true });
      return;
    }

    setTimeRemaining(session.time_remaining_seconds);

    // Populate existing answers
    const existing = new Map<number, OptionKey | null>();
    for (const ans of session.answers) {
      existing.set(ans.question_id, ans.selected_option);
    }
    setAnswers(existing);
  }, [session, navigate]);

  // -----------------------------------------------------------------------
  // Timer countdown
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (timeRemaining === null || submittedRef.current) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          // Time's up — auto-submit
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining !== null]);

  // -----------------------------------------------------------------------
  // Auto-save every 30 seconds
  // -----------------------------------------------------------------------

  const saveCurrentAnswer = useCallback(
    (questionId: number, option: OptionKey | null) => {
      if (!session || submittedRef.current) return;
      examsService
        .saveAnswer(sId, {
          question_id: questionId,
          selected_option: option,
          time_remaining_seconds: timeRemaining ?? 0,
        })
        .catch((err: { response?: { status?: number; data?: { auto_submitted?: boolean } } }) => {
          // Server enforces the wall-clock deadline: a 409 with
          // auto_submitted means time ran out — leave the exam screen.
          if (err.response?.status === 409 && err.response.data?.auto_submitted) {
            submittedRef.current = true;
            navigate('/student/exam/complete', { replace: true });
          }
          // Otherwise silently fail — answer will be retried
        });
    },
    [session, sId, timeRemaining, navigate],
  );

  useEffect(() => {
    if (!session || submittedRef.current) return;

    autoSaveRef.current = setInterval(() => {
      // Save current question's answer as a heartbeat
      const q = session.questions[currentIdx];
      if (q) {
        const opt = answers.get(q.id) ?? null;
        saveCurrentAnswer(q.id, opt);
      }
    }, 30_000);

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [session, currentIdx, answers, saveCurrentAnswer]);

  // -----------------------------------------------------------------------
  // Fullscreen
  // -----------------------------------------------------------------------

  useEffect(() => {
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {
        // Some browsers may block — we still continue
      });
    }

    const onFullscreenChange = () => {
      if (!document.fullscreenElement && !submittedRef.current) {
        // Fullscreen exited
        examsService.logCheatEvent(sId, 'fullscreen_exit').catch(() => {});
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      // Exit fullscreen on unmount if still active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [sId]);

  // -----------------------------------------------------------------------
  // Anti-cheat: visibility change (tab switch)
  // -----------------------------------------------------------------------

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && !submittedRef.current) {
        // Log the event on the server
        examsService
          .logCheatEvent(sId, 'tab_switch')
          .then((res) => {
            if (res.auto_submitted) {
              // Server auto-submitted — navigate to complete
              submittedRef.current = true;
              navigate('/student/exam/complete', {
                replace: true,
                state: {
                  autoSubmitted: true,
                  testTitle: session?.test_title,
                },
              });
            }
          })
          .catch(() => {});

        // Update local warning count (pure updater, no side effects)
        setCheatWarnings((prev) => prev + 1);
        setShowCheatWarning(true);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [sId, session, navigate]);

  // Anti-cheat: Disable right click, copy, cut, select, print, printscreen, developer tools, and handle blur
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMetaOrCtrl = e.ctrlKey || e.metaKey;
      if (
        (isMetaOrCtrl && ['c', 'x', 'u', 'p'].includes(e.key.toLowerCase())) ||
        (isMetaOrCtrl && e.shiftKey && e.key.toLowerCase() === 'i') ||
        e.key === 'F12' ||
        e.key === 'PrintScreen' ||
        e.key === 'Snapshot'
      ) {
        e.preventDefault();
        if (e.key === 'PrintScreen' || e.key === 'Snapshot') {
          navigator.clipboard?.writeText("Screenshots are disabled for this exam.").catch(() => {});
        }
      }
    };

    const handleBlur = () => {
      setIsWindowBlurred(true);
    };

    const handleFocus = () => {
      setIsWindowBlurred(false);
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Submit
  // -----------------------------------------------------------------------

  const submitMutation = useMutation({
    mutationFn: () => examsService.submitExam(sId),
    onSuccess: () => {
      submittedRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);

      const totalDuration = session ? session.test_duration_minutes * 60 : 0;
      const attempted = Array.from(answers.values()).filter((v) => v !== null).length;

      navigate('/student/exam/complete', {
        replace: true,
        state: {
          totalQuestions: session?.questions.length ?? 0,
          attempted,
          timeTaken: formatTimeTaken(totalDuration, timeRemaining ?? 0),
          testTitle: session?.test_title,
        },
      });
    },
    onError: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = useCallback(
    (auto = false) => {
      if (submittedRef.current || isSubmitting) return;
      setIsSubmitting(true);
      submittedRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (auto) {
        // Auto-submit: skip dialog
        submitMutation.mutate();
      } else {
        submitMutation.mutate();
      }
    },
    [submitMutation, isSubmitting],
  );

  // -----------------------------------------------------------------------
  // Option selection
  // -----------------------------------------------------------------------

  const handleSelectOption = (questionId: number, option: OptionKey) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      const current = next.get(questionId);
      // Toggle: deselect if same option
      const newVal = current === option ? null : option;
      next.set(questionId, newVal);
      // Immediate save
      saveCurrentAnswer(questionId, newVal);
      return next;
    });
  };

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------

  const goToQuestion = (idx: number) => setCurrentIdx(idx);
  const goPrev = () => setCurrentIdx((i) => Math.max(0, i - 1));
  const goNext = () =>
    setCurrentIdx((i) => Math.min((session?.questions.length ?? 1) - 1, i + 1));

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner label="Loading exam..." />
      </div>
    );
  }

  if (isError || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <p className="text-sm text-destructive">Failed to load exam session.</p>
          <Button variant="outline" onClick={() => navigate('/student/exams')}>
            Back to Exams
          </Button>
        </div>
      </div>
    );
  }

  const questions: ExamQuestion[] = session.questions;
  const currentQuestion = questions[currentIdx];
  const selectedOption = currentQuestion ? (answers.get(currentQuestion.id) ?? null) : null;
  const attemptedCount = Array.from(answers.values()).filter((v) => v !== null).length;
  const isTimeLow = timeRemaining !== null && timeRemaining < 300; // < 5 min

  return (
    <div className="flex h-screen flex-col bg-background select-none relative">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold truncate max-w-xs">{session.test_title}</h1>
          <Badge variant="secondary">
            {attemptedCount}/{questions.length} answered
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-1.5 font-mono text-lg font-bold ${
              isTimeLow ? 'text-destructive animate-pulse' : 'text-foreground'
            }`}
          >
            <Clock className="h-4 w-4" />
            {timeRemaining !== null ? formatTimer(timeRemaining) : '--:--'}
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowSubmitDialog(true)}
            disabled={isSubmitting}
          >
            <Send className="mr-2 h-3.5 w-3.5" />
            Submit
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Question navigation sidebar */}
        <aside className="w-64 shrink-0 border-r bg-muted/30 overflow-y-auto p-4 hidden md:block">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Questions</p>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = answers.get(q.id) !== null && answers.get(q.id) !== undefined;
              const isCurrent = idx === currentIdx;
              return (
                <button
                  key={q.id}
                  onClick={() => goToQuestion(idx)}
                  className={`
                    flex h-10 w-10 items-center justify-center rounded-md text-sm font-bold transition-colors
                    ${isCurrent ? 'ring-2 ring-indigo-600 ring-offset-2' : ''}
                    ${
                      isAnswered
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                    }
                  `}
                  aria-label={`Question ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1.5 text-xs font-bold">
            <div className="flex items-center gap-2 text-emerald-700">
              <span className="inline-block h-3.5 w-3.5 rounded-sm bg-emerald-600" />
              Answered
            </div>
            <div className="flex items-center gap-2 text-rose-700">
              <span className="inline-block h-3.5 w-3.5 rounded-sm bg-rose-50 border border-rose-200" />
              Not answered
            </div>
          </div>

          {cheatWarnings > 0 && (
            <div className="mt-4 rounded-md bg-amber-100 dark:bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
              Tab switches: {cheatWarnings}/3
            </div>
          )}
        </aside>

        {/* Main question area */}
        <main className="flex-1 overflow-y-auto p-6">
          {currentQuestion ? (
            <div className="w-full space-y-6">
              {/* Question header */}
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-medium">
                  <span className="text-muted-foreground mr-2">Q{currentIdx + 1}.</span>
                  {currentQuestion.question_text}
                </h2>
                <Badge variant="outline" className="shrink-0">
                  {currentQuestion.marks} {currentQuestion.marks === 1 ? 'mark' : 'marks'}
                </Badge>
              </div>

              {/* Question image */}
              {currentQuestion.question_image && (
                <img
                  src={currentQuestion.question_image}
                  alt="Question"
                  className="max-h-64 rounded-md border object-contain"
                />
              )}

              {/* Options */}
              <div className="space-y-3">
                {/* The server decides the order — it applies the test's shuffle_options
                    setting and keeps it stable for this session. Each key still identifies
                    the same option, so what we send back is unchanged either way. */}
                {(currentQuestion.option_order ?? OPTION_KEYS).map((key, position) => {
                  // Badge follows the POSITION, not the key, so the student always reads
                  // A, B, C, D down the page even when the underlying order is shuffled.
                  const label = OPTION_LABELS[OPTION_KEYS[position]];
                  const optionText =
                    currentQuestion[`option_${key}` as keyof ExamQuestion] as string;
                  const optionImage =
                    currentQuestion[`option_${key}_image` as keyof ExamQuestion] as
                      | string
                      | null;
                  const isSelected = selectedOption === key;

                  return (
                    <button
                      key={key}
                      onClick={() => handleSelectOption(currentQuestion.id, key)}
                      className={`
                        w-full rounded-lg border p-4 text-left transition-colors
                        ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary'
                            : 'border-border bg-card hover:bg-accent/50'
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`
                            flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold
                            ${
                              isSelected
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }
                          `}
                        >
                          {label}
                        </span>
                        <div className="flex-1">
                          <span className="text-sm">{optionText}</span>
                          {optionImage && (
                            <img
                              src={optionImage}
                              alt={`Option ${label}`}
                              className="mt-2 max-h-32 rounded border object-contain"
                            />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  disabled={currentIdx === 0}
                  onClick={goPrev}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentIdx + 1} of {questions.length}
                </span>
                <Button
                  variant="outline"
                  disabled={currentIdx === questions.length - 1}
                  onClick={goNext}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>

              {/* Mobile question nav */}
              <div className="md:hidden">
                <p className="text-xs font-medium text-muted-foreground mb-2">Jump to question:</p>
                <div className="flex flex-wrap gap-1.5">
                  {questions.map((q, idx) => {
                    const isAnswered = answers.get(q.id) !== null && answers.get(q.id) !== undefined;
                    const isCurrent = idx === currentIdx;
                    return (
                      <button
                        key={q.id}
                        onClick={() => goToQuestion(idx)}
                        className={`
                          flex h-8 w-8 items-center justify-center rounded text-xs font-medium
                          ${isCurrent ? 'ring-2 ring-primary ring-offset-1' : ''}
                          ${
                            isAnswered
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-card border border-border'
                          }
                        `}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No questions available.
            </div>
          )}
        </main>
      </div>

      {/* Submit confirmation dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Exam?</DialogTitle>
            <DialogDescription>
              You have answered {attemptedCount} out of {questions.length} questions.
              {attemptedCount < questions.length && (
                <span className="block mt-1 text-amber-600">
                  {questions.length - attemptedCount} question(s) are unanswered.
                </span>
              )}
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Continue Exam
            </Button>
            <Button
              variant="destructive"
              disabled={isSubmitting}
              onClick={() => {
                setShowSubmitDialog(false);
                handleSubmit(false);
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Exam'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Anti-cheat warning dialog */}
      <Dialog open={showCheatWarning} onOpenChange={setShowCheatWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Warning: Tab Switch Detected
            </DialogTitle>
            <DialogDescription>
              {cheatWarnings >= 3 ? (
                'You have exceeded the maximum allowed tab switches. Your exam is being submitted.'
              ) : (
                <>
                  Switching tabs or leaving the exam window is not allowed. You have{' '}
                  <strong>{3 - cheatWarnings}</strong> warning(s) remaining before your exam is
                  automatically submitted.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowCheatWarning(false)}>
              {cheatWarnings >= 3 ? 'OK' : 'Return to Exam'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Blur Overlay for Anti-Screenshot & Focus Protection */}
      {isWindowBlurred && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-md z-[9999] flex items-center justify-center select-none">
          <div className="text-center p-6 bg-card border rounded-2xl shadow-xl max-w-sm">
            <p className="text-base font-bold text-destructive">Exam Window Out of Focus</p>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              Please click back inside this window to resume your exam. Screenshots or screen sharing is prohibited.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
