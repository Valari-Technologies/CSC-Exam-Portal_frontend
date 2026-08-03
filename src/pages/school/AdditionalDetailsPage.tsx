import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, AlertCircle, LifeBuoy } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Spinner } from '@/components/ui/Spinner';
import { useCurrentSchool } from '@/hooks/useCurrentSchool';
import { supportService } from '@/services/support.service';
import { extractApiError } from '@/lib/password';
import type { SupportIssueType } from '@/types';
import additionalDetailsHeaderImg from '@/assets/dashboard_designs/School/Additonal details.webp';

const ISSUE_OPTIONS: { value: SupportIssueType; label: string }[] = [
  { value: 'incorrect_school_name', label: 'Incorrect School Name' },
  { value: 'incorrect_login_email', label: 'Incorrect School Login Email' },
  { value: 'password_issue', label: 'Password Issue' },
  { value: 'other', label: 'Other' },
];

const selectClass =
  'w-full py-2 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring';

/** Read-only context row showing a piece of the school's current record. */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <p className="px-3 py-2 rounded-md border border-input bg-muted/40 text-sm">
        {value || '—'}
      </p>
    </div>
  );
}

export default function AdditionalDetailsPage() {
  const { data: school, isLoading } = useCurrentSchool();
  const [issueType, setIssueType] = useState<SupportIssueType | ''>('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      supportService.create({
        issue_type: issueType as SupportIssueType,
        description: description.trim(),
      }),
    onSuccess: () => {
      setSubmitted(true);
      setIssueType('');
      setDescription('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitted(false);
    if (!issueType) {
      setFormError('Please select an issue type.');
      return;
    }
    if (!description.trim()) {
      setFormError('Please describe the issue.');
      return;
    }
    mutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="py-16">
        <Spinner label="Loading school details…" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Top Header Card */}
      <div className="relative group rounded-[20px] overflow-hidden shadow-sm border border-slate-200/60 min-h-[160px] md:min-h-[180px] flex items-center bg-[#fbfbfe] w-full">
        <img
          src={additionalDetailsHeaderImg}
          alt="Additional Details Header"
          className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
        />
        {/* Overlay to ensure high contrast/readability for the text */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent z-0" />

        <div className="relative z-10 px-6 sm:px-8 py-6 max-w-2xl">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <LifeBuoy className="h-7 w-7 text-indigo-600" />
            Additional Details
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 leading-relaxed font-medium">
            Request a correction to your school's information. Your request is sent to the CSC
            Super Admin, who will reply in your Notifications.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">School Information</CardTitle>
          <CardDescription>
            These are your school's current details. If any are wrong, describe the issue below.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DetailRow label="School Name" value={school?.name ?? ''} />
          <DetailRow label="School ID" value={school?.code ?? ''} />
          <DetailRow label="Principal Name" value={school?.principal_name ?? ''} />
          <DetailRow label="School Official Email" value={school?.official_email ?? ''} />
          <DetailRow
            label="School Board"
            value={
              school?.school_board === 'state_board' ? 'State Board'
                : school?.school_board === 'cbse' ? 'CBSE Board'
                : school?.school_board === 'matriculation' ? 'Matriculation'
                : school?.school_board ?? ''
            }
          />
          <DetailRow label="School Code" value={school?.school_code ?? ''} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Raise a Request</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="issue_type">
                Issue Type <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <select
                id="issue_type"
                className={selectClass}
                value={issueType}
                onChange={(e) => {
                  setIssueType(e.target.value as SupportIssueType | '');
                  setSubmitted(false);
                }}
              >
                <option value="">Select an issue type</option>
                {ISSUE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description appears only once an issue type is chosen. */}
            {issueType && (
              <div className="space-y-1.5">
                <Label htmlFor="description">
                  Description <span className="ml-0.5 text-destructive">*</span>
                </Label>
                <textarea
                  id="description"
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue in detail…"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                />
              </div>
            )}

            {formError && (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span role="alert">{formError}</span>
              </div>
            )}

            {mutation.isError && (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span role="alert">
                  {extractApiError(mutation.error, 'Could not send your request. Please try again.')}
                </span>
              </div>
            )}

            {submitted && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4 shrink-0" />
                <span>
                  Your request has been sent to the CSC Super Admin. You'll receive their reply
                  in Notifications.
                </span>
              </div>
            )}

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Sending…' : 'Send'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
