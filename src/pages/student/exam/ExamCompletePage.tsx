import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';

interface ExamCompleteState {
  totalQuestions?: number;
  attempted?: number;
  timeTaken?: string;
  testTitle?: string;
  autoSubmitted?: boolean;
}

export default function ExamCompletePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as ExamCompleteState) || {};

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-2">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/10">
            <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <CardTitle className="text-xl">
            {state.autoSubmitted ? 'Exam Auto-Submitted' : 'Exam Submitted Successfully'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.autoSubmitted && (
            <p className="text-sm text-amber-600">
              Your exam was automatically submitted due to exceeding the anti-cheat threshold.
            </p>
          )}

          {state.testTitle && (
            <p className="text-sm text-muted-foreground">{state.testTitle}</p>
          )}

          {(state.totalQuestions !== undefined || state.attempted !== undefined || state.timeTaken) && (
            <div className="mx-auto grid max-w-xs grid-cols-3 gap-4 pt-2">
              {state.totalQuestions !== undefined && (
                <div>
                  <div className="text-2xl font-bold">{state.totalQuestions}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              )}
              {state.attempted !== undefined && (
                <div>
                  <div className="text-2xl font-bold">{state.attempted}</div>
                  <div className="text-xs text-muted-foreground">Attempted</div>
                </div>
              )}
              {state.timeTaken && (
                <div>
                  <div className="text-2xl font-bold">{state.timeTaken}</div>
                  <div className="text-xs text-muted-foreground">Time</div>
                </div>
              )}
            </div>
          )}

          {/* A test with "show result immediately" publishes its result on submission, so
              this page can no longer promise that a teacher has to act first. */}
          <p className="text-sm text-muted-foreground">
            Your answers have been submitted. Check View Results — if your result is not
            there yet, it will appear once your teacher publishes it.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => navigate('/student/results')}>
            View Results
          </Button>
          <Button variant="gradient" onClick={() => navigate('/student/dashboard')}>
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
