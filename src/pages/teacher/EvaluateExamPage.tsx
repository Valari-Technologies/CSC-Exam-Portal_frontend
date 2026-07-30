import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { CheckCircle2, Send, XCircle, ClipboardCheck } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { examsService } from '@/services/exams.service';
import { resultsService } from '@/services/results.service';
import { cn } from '@/lib/utils';
import type { OptionKey, ReviewQuestion } from '@/types';

const OPTION_KEYS: OptionKey[] = ['a', 'b', 'c', 'd'];

function optionText(q: ReviewQuestion, key: OptionKey): string {
  return { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d }[key];
}

export default function EvaluateExamPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const queryClient = useQueryClient();
  const sId = Number(sessionId);

  const [error, setError] = useState<string | null>(null);
  // Shows a confirmation after an evaluate succeeds. Without it, a re-save (which doesn't
  // change the visible status) looked like it did nothing — the reported bug.
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const { data: review, isLoading } = useQuery({
    queryKey: ['session-review', sessionId],
    queryFn: () => examsService.review(sId),
    enabled: !!sessionId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['session-review', sessionId] });
    queryClient.invalidateQueries({ queryKey: ['exam-sessions'] });
    queryClient.invalidateQueries({ queryKey: ['class-results'] });
  };

  const evaluateMutation = useMutation({
    // MCQ marks are auto-scored from correct/wrong answers — there is no manual awarding.
    // Sending an empty adjustment list simply transitions submitted -> evaluated,
    // confirming the auto-scoring so the result can then be published.
    mutationFn: () => examsService.evaluate(sId, []),
    onSuccess: () => { setError(null); setSavedAt(Date.now()); invalidate(); },
    onError: (err) => {
      if (err instanceof AxiosError && err.response?.data) {
        const d = err.response.data as Record<string, string[] | string>;
        const first = Object.values(d)[0];
        setError(Array.isArray(first) ? first[0] : String(first));
      } else setError('Failed to save evaluation.');
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => resultsService.publish(review!.result.id, true),
    onSuccess: () => { setError(null); invalidate(); },
    onError: () => setError('Failed to publish result.'),
  });

  if (isLoading) return <Spinner label="Loading exam review..." />;
  if (!review) return <p className="text-sm text-destructive">Exam review not found.</p>;

  const isPublished = review.status === 'published';
  const isEvaluated = review.status === 'evaluated';

  // Marks are the auto-scored result — obtained out of total.
  const obtainedTotal = parseFloat(review.result.obtained_marks) || 0;
  const maxTotal = parseFloat(review.result.total_marks);
  const obtainedPct = maxTotal > 0 ? (obtainedTotal / maxTotal) * 100 : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header Card */}
      <div className="bg-white rounded-[20px] p-6 shadow-xs border border-slate-200/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <ClipboardCheck className="h-7 w-7 text-[#2563eb]" />
            Answer Review
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 leading-relaxed font-medium">
            {review.student_name} — {review.subject_name} - {review.test_title}
          </p>
        </div>
        <Badge variant={isPublished ? 'success' : isEvaluated ? 'default' : 'warning'} className="shrink-0">
          {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
        </Badge>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>
      )}

      {/* summary */}
      {/* summary */}
      <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-xs grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground font-semibold">Total Marks</p>
          <p className="text-lg font-bold text-indigo-600 mt-1">
            {obtainedTotal.toFixed(2)} / {maxTotal.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground font-semibold">Percentage</p>
          <p className="text-lg font-bold text-emerald-600 mt-1">{obtainedPct.toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-muted-foreground font-semibold mb-1">Pass / Fail</p>
          <Badge variant={review.result.passed ? 'success' : 'destructive'}>
            {review.result.passed ? 'Pass' : 'Fail'}
          </Badge>
        </div>
        <div>
          <p className="text-muted-foreground font-semibold">Submitted</p>
          <p className="font-bold text-slate-800 mt-1">
            {review.submitted_at ? new Date(review.submitted_at).toLocaleString() : '--'}
          </p>
        </div>
      </div>

      {/* questions */}
      <div className="space-y-4">
        {review.questions.map((q, idx) => (
          <div key={q.question_id} className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h3 className="text-base font-bold text-slate-900 flex items-start justify-between gap-3">
                <span>Q{idx + 1}. {q.question_text}</span>
                {q.is_correct ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                )}
              </h3>
            </div>
            <div className="px-5 pb-4 pt-1 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {OPTION_KEYS.map((key) => {
                  const isStudent = q.student_answer === key;
                  const isCorrect = q.correct_answer === key;
                  return (
                    <div
                      key={key}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-sm transition-all',
                        isCorrect && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 font-semibold',
                        isStudent && !isCorrect && 'border-destructive bg-destructive/10 font-semibold',
                      )}
                    >
                      <span className="font-semibold uppercase mr-2">{key}.</span>
                      {optionText(q, key)}
                      {isCorrect && (
                        <span className="ml-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          Correct Answer
                        </span>
                      )}
                      {isStudent && (
                        <span className={cn('ml-2 text-xs font-semibold', isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive')}>
                          Student&apos;s Answer
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {q.student_answer === null && (
                <p className="text-xs text-muted-foreground italic">Not answered.</p>
              )}
              {/* Marks are auto-scored from the answer (correct/wrong) — shown, not edited. */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-sm text-muted-foreground font-semibold">Marks:</span>
                <span className="text-sm font-bold text-slate-800 tabular-nums">
                  {(parseFloat(q.marks_obtained) || 0).toFixed(1)} / {parseFloat(q.max_marks).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* actions */}
      <div className="flex items-center justify-end gap-3 pb-8">
        {savedAt !== null && !evaluateMutation.isPending && (
          <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Evaluation saved
          </span>
        )}
        {!isPublished && (
          <Button
            variant="secondary"
            disabled={evaluateMutation.isPending}
            onClick={() => evaluateMutation.mutate()}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {evaluateMutation.isPending ? 'Saving...' : isEvaluated ? 'Re-save Evaluation' : 'Save Evaluation'}
          </Button>
        )}
        {isEvaluated && (
          <Button
            variant="gradient"
            disabled={publishMutation.isPending}
            onClick={() => publishMutation.mutate()}
          >
            <Send className="mr-2 h-4 w-4" />
            {publishMutation.isPending ? 'Publishing...' : 'Publish Result'}
          </Button>
        )}
        {isPublished && (
          <Badge variant="success" className="self-center">Result published to student</Badge>
        )}
      </div>
    </div>
  );
}
