import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { testsService } from '@/services/tests.service';
import type { TestAssignmentListItem } from '@/types';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function TestAssignmentsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const testId = Number(id);

  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<TestAssignmentListItem | null>(null);

  const { data: test } = useQuery({
    queryKey: ['test', id],
    queryFn: () => testsService.get(testId),
    enabled: !!id,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['test-assignments', testId, page],
    queryFn: () => testsService.listAssignments({ test: testId, page }),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (assignmentId: number) => testsService.removeAssignment(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['test', id] });
      setPendingDelete(null);
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Assignments</h1>
          <p className="text-sm text-muted-foreground">
            {test ? `Assignments for "${test.title}"` : 'Loading...'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/tests/${testId}`)}>Back to Test</Button>
          <Button variant="gradient" onClick={() => navigate(`/tests/${testId}/assign`)}>
            <Plus className="mr-2 h-4 w-4" /> New Assignment
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="py-12"><Spinner label="Loading assignments..." /></div>
        ) : isError ? (
          <div className="py-12 text-center text-sm text-destructive">Failed to load assignments.</div>
        ) : data && data.results.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No assignments yet. Assign this test to classes or sections.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">S.No</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.results.map((a, index) => {
                // The window state comes from the server, which is the same clock
                // that decides whether a student's start is accepted. Reading the
                // browser's clock here could have shown a teacher "Ongoing" for a
                // window their students were already being turned away from.
                const isExpired = a.availability === 'expired';
                const isOngoing = a.is_active && a.availability === 'open';
                const isUpcoming = a.is_active && a.availability === 'upcoming';

                return (
                  <TableRow key={a.id}>
                    <TableCell className="text-muted-foreground tabular-nums">{(page - 1) * 20 + index + 1}</TableCell>
                    <TableCell className="capitalize">{a.assigned_to_type}</TableCell>
                    <TableCell>{a.class_name ?? '--'}</TableCell>
                    <TableCell>{a.section_name ?? '--'}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(a.start_datetime)}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(a.end_datetime)}</TableCell>
                    <TableCell>
                      {isOngoing ? (
                        <Badge variant="success">Ongoing</Badge>
                      ) : isUpcoming ? (
                        <Badge variant="warning">Upcoming</Badge>
                      ) : isExpired ? (
                        <Badge variant="secondary">Expired</Badge>
                      ) : (
                        <Badge variant={a.is_active ? 'default' : 'destructive'}>
                          {a.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPendingDelete(a)}
                        aria-label="Delete assignment"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {data && data.count > 20 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {page} of {totalPages} -- {data.count} total</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!data.previous} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <Button variant="outline" size="sm" disabled={!data.next} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete assignment?</DialogTitle>
            <DialogDescription>
              This will permanently delete this assignment. Students will no longer be able to take this test through this assignment.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
