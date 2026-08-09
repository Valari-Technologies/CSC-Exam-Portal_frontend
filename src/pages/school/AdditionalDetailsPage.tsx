import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, AlertCircle, LifeBuoy, Clock, CheckCircle2, MessageSquare, Calendar, Trash2 } from 'lucide-react';

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
  'w-full py-2 px-3 rounded-md border border-slate-200 bg-background text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all duration-150 hover:bg-slate-50/50 cursor-pointer';

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

function getIssueTypeLabel(type: string) {
  const option = ISSUE_OPTIONS.find((o) => o.value === type);
  return option ? option.label : type;
}

export default function AdditionalDetailsPage() {
  const { data: school, isLoading } = useCurrentSchool();
  const [issueType, setIssueType] = useState<SupportIssueType | ''>('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: requestsData, isLoading: isRequestsLoading, refetch: refetchRequests } = useQuery({
    queryKey: ['support-requests'],
    queryFn: () => supportService.list({ page: 1 }),
  });

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
      refetchRequests();
    },
  });

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => supportService.delete(id),
    onSuccess: (_, deletedId) => {
      refetchRequests();
      setSelectedIds((prev) => prev.filter((id) => id !== deletedId));
    },
  });

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedIds.length} selected requests?`)) return;

    setIsDeletingBulk(true);
    try {
      await Promise.all(selectedIds.map((id) => supportService.delete(id)));
      setSelectedIds([]);
      refetchRequests();
    } catch (err) {
      console.error('Bulk delete failed:', err);
    } finally {
      setIsDeletingBulk(false);
    }
  };

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
    <div className="space-y-6 max-w-6xl w-full">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        {/* Left column: School Info & Raise Request form */}
        <div className="space-y-6 lg:col-span-7">
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

        {/* Right column: Request History & replies from Super Admin */}
        <div className="lg:col-span-5 h-full">
          <Card className="h-full flex flex-col">
            <CardHeader className="relative">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-indigo-600" />
                    Request History & Replies
                  </CardTitle>
                  <CardDescription>
                    Track your raised support tickets and see replies from the CSC Super Admin.
                  </CardDescription>
                </div>
              </div>

              {/* Bulk Actions Bar */}
              {requestsData && requestsData.results.length > 0 && (
                <div className="flex items-center gap-3 pt-3 border-t border-slate-100 mt-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      checked={
                        selectedIds.length > 0 &&
                        selectedIds.length === requestsData.results.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(requestsData.results.map((r) => r.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                    Select All
                  </label>

                  {selectedIds.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={isDeletingBulk}
                      className="ml-auto h-8 px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Selected ({selectedIds.length})
                    </Button>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto max-h-[600px] custom-scrollbar space-y-4">
              {isRequestsLoading ? (
                <div className="py-8 flex items-center justify-center">
                  <Spinner label="Loading request history..." />
                </div>
              ) : !requestsData || requestsData.results.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No support requests raised yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {requestsData.results.map((req, index) => {
                    const isSelected = selectedIds.includes(req.id);
                    return (
                      <div
                        key={req.id}
                        className={`p-4 rounded-xl border transition-all hover:border-slate-200 hover:bg-slate-50/50 flex gap-3 items-start ${
                          isSelected ? 'border-indigo-200 bg-indigo-50/10' : 'border-slate-100 bg-slate-50/30'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className="pt-1.5">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds((prev) => [...prev, req.id]);
                              } else {
                                setSelectedIds((prev) => prev.filter((id) => id !== req.id));
                              }
                            }}
                          />
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-slate-400 font-mono">
                              {index + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                  req.status === 'resolved'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}
                              >
                                {req.status === 'resolved' ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3" />
                                    Resolved
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3 w-3" />
                                    Pending
                                  </>
                                )}
                              </span>

                              {/* Single Delete Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to delete this request?')) {
                                    deleteMutation.mutate(req.id);
                                  }
                                }}
                                disabled={deleteMutation.isPending}
                                className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                title="Delete request"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">
                              {getIssueTypeLabel(req.issue_type)}
                            </h4>
                            <p className="text-slate-500 text-xs mt-1 leading-relaxed whitespace-pre-wrap">
                              {req.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              {new Date(req.created_at).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          {req.admin_reply && (
                            <div className="p-3.5 rounded-lg bg-indigo-50/40 border border-indigo-100/50 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
                                Super Admin Reply
                              </div>
                              <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">
                                {req.admin_reply}
                              </p>
                              {req.resolved_at && (
                                <div className="text-[10px] text-slate-400 italic">
                                  Resolved on{' '}
                                  {new Date(req.resolved_at).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
