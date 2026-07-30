import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Check, LifeBuoy } from 'lucide-react';

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
import { Label } from '@/components/ui/Label';
import { Spinner } from '@/components/ui/Spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { supportService } from '@/services/support.service';
import { extractApiError } from '@/lib/password';
import type { SupportRequest, SupportStatus } from '@/types';
import supportRequestImg from '@/assets/dashboard_designs/support request/support request.png';
import { CustomSelect } from '@/components/ui/CustomSelect';

const STATUS_VARIANT: Record<SupportStatus, 'success' | 'warning'> = {
  open: 'warning',
  resolved: 'success',
};

export default function SupportRequestsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'' | SupportStatus>('');
  const [selected, setSelected] = useState<SupportRequest | null>(null);
  const [reply, setReply] = useState('');
  const [resolve, setResolve] = useState(true);

  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'open', label: 'Open' },
    { value: 'resolved', label: 'Resolved' },
  ];

  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['support-requests', { page, status: statusFilter }],
    queryFn: () =>
      supportService.list({ page, status: statusFilter || undefined }),
    placeholderData: keepPreviousData,
  });

  const replyMutation = useMutation({
    mutationFn: (id: number) => supportService.reply(id, { reply: reply.trim(), resolve }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-requests'] });
      setSelected(null);
      setReply('');
      setResolve(true);
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1;

  const openRequest = (request: SupportRequest) => {
    setSelected(request);
    setReply(request.admin_reply ?? '');
    setResolve(request.status !== 'resolved');
    replyMutation.reset();
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleString();

  return (
    <div className="space-y-6">
      {/* Top Header Card with support request.png background */}
      <div className="relative group rounded-[20px] overflow-hidden shadow-sm border border-slate-200/60 min-h-[160px] md:min-h-[180px] flex items-center bg-[#e8e8ea]">
        <img
          src={supportRequestImg}
          alt="Support Requests Header"
          className="absolute left-0 right-0 w-full select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
          style={{
            height: '150%',
            top: '-22.8%',
            objectFit: 'cover',
            objectPosition: 'right center',
          }}
        />
        {/* Subtle overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/35 via-white/10 to-transparent"></div>
        
        <div className="relative z-10 w-full p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] tracking-tight flex items-center gap-3 flex-wrap leading-tight drop-shadow-sm">
              <LifeBuoy className="h-7 w-7 text-rose-600 animate-pulse" />
              Support Requests
            </h1>
            <p className="text-slate-700 text-xs sm:text-sm mt-2 leading-relaxed font-semibold drop-shadow-sm max-w-xl">
              Additional Details requests raised by School Admins. Review, resolve, and reply.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <CustomSelect
          options={statusOptions}
          value={statusFilter}
          onChange={(val) => { setStatusFilter(val as '' | SupportStatus); setPage(1); }}
          placeholder="Filter by status..."
          containerClassName="w-48"
        />
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="py-12">
            <Spinner label="Loading requests…" />
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-sm text-destructive">
            Failed to load support requests.
          </div>
        ) : data && data.results.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No support requests found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">S.No</TableHead>
                <TableHead>Date / Time</TableHead>
                <TableHead>School</TableHead>
                <TableHead>School ID</TableHead>
                <TableHead>Issue Type</TableHead>
                <TableHead>Raised By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.results.map((request, index) => (
                <TableRow key={request.id}>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {(page - 1) * 20 + index + 1}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTime(request.created_at)}
                  </TableCell>
                  <TableCell className="font-medium">{request.school_name}</TableCell>
                  <TableCell className="font-mono text-xs">{request.school_code}</TableCell>
                  <TableCell className="text-sm">{request.issue_type_display}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {request.raised_by_name || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[request.status]}>{request.status_display}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => openRequest(request)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {data && data.count > 20 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages} — {data.count} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!data.previous}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data.next}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Support request</DialogTitle>
            <DialogDescription>
              {selected?.school_name} (School ID: {selected?.school_code})
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Issue Type</p>
                  <p className="font-medium">{selected.issue_type_display}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={STATUS_VARIANT[selected.status]}>{selected.status_display}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Principal Name</p>
                  <p>{selected.school_principal_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">School Official Email</p>
                  <p className="break-all">{selected.school_official_email || '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Raised By</p>
                  <p>
                    {selected.raised_by_name || '—'}
                    {selected.raised_by_email ? ` · ${selected.raised_by_email}` : ''}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="rounded-md border border-input bg-muted/40 p-3 text-sm whitespace-pre-wrap">
                  {selected.description}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reply">Reply to School Admin</Label>
                <textarea
                  id="reply"
                  rows={4}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply…"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={resolve}
                  onChange={(e) => setResolve(e.target.checked)}
                  className="rounded border-input"
                />
                Mark this request as resolved
              </label>

              {selected.admin_reply && (
                <p className="text-xs text-muted-foreground">
                  <Check className="inline h-3 w-3 mr-1" />
                  A reply was already sent. Sending again updates it.
                </p>
              )}

              {replyMutation.isError && (
                <p className="text-sm text-destructive" role="alert">
                  {extractApiError(replyMutation.error, 'Could not send the reply. Please try again.')}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button
              disabled={replyMutation.isPending || !reply.trim()}
              onClick={() => selected && replyMutation.mutate(selected.id)}
            >
              {replyMutation.isPending ? 'Sending…' : resolve ? 'Send Reply & Resolve' : 'Send Reply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
