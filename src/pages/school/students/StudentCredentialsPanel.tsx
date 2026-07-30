import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { StudentProfileDetail } from '@/types';

interface StudentCredentialsPanelProps {
  student: StudentProfileDetail;
  /** Wording differs slightly between a new student and a password reset. */
  mode: 'created' | 'password-reset';
  onDone: () => void;
}

/**
 * Shows a student's login credentials once, right after they are set.
 *
 * The password only exists in plaintext in this one API response — it is stored as a
 * hash and can never be read back. So both the create and the reset flow have to stop
 * here and let the admin capture it, rather than navigating straight away.
 *
 * Student ID and Password each have their OWN Copy button (item 5) so the admin can copy
 * either value on its own.
 */
export default function StudentCredentialsPanel({
  student,
  mode,
  onDone,
}: StudentCredentialsPanelProps) {
  // Which field was last copied, so only that button shows the "Copied" state.
  const [copiedField, setCopiedField] = useState<'id' | 'password' | null>(null);

  const copy = async (field: 'id' | 'password', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 2000);
    } catch {
      // Clipboard can be blocked (e.g. insecure context); the value is still on screen to copy.
    }
  };

  const rows: { key: 'id' | 'password'; label: string; value: string }[] = [
    { key: 'id', label: 'Student ID', value: student.student_id ?? '' },
    { key: 'password', label: 'Password', value: student.initial_password ?? '' },
  ];

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{mode === 'created' ? 'Student created' : 'Password reset'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Give these credentials to{' '}
          <span className="font-medium text-foreground">{student.user.full_name}</span>. They sign in
          at <code>/studentlogin</code>. The password is shown{' '}
          <span className="font-medium text-foreground">only now</span> — it cannot be retrieved
          later. If it is lost, edit the student and set a new one.
        </p>

        <dl className="rounded-md border border-border divide-y divide-border">
          {rows.map(({ key, label, value }) => (
            <div key={key} className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-sm font-medium truncate">{value}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copy(key, value)}
                  aria-label={`Copy ${label}`}
                  className="shrink-0"
                >
                  {copiedField === key ? (
                    <>
                      <Check className="mr-1 h-3.5 w-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </Button>
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex justify-end">
          <Button type="button" variant="gradient" onClick={onDone}>
            Done
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
