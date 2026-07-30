import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Eye, EyeOff, Award } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { resultsService } from '@/services/results.service';
import { testsService } from '@/services/tests.service';

export default function ClassResultsPage() {
  const { testId } = useParams<{ testId: string }>();
  const queryClient = useQueryClient();
  const tId = Number(testId);
  const [page, setPage] = useState(1);

  const { data: test } = useQuery({
    queryKey: ['test', tId],
    queryFn: () => testsService.get(tId),
    enabled: !!testId,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['class-results', tId, page],
    // Ordered by rank, not by raw marks. The two agree on the leader but not on
    // ties: joint 2nd is two rows with the same rank, and marks-ordering would
    // let the DB pick which of them prints first, so the Rank column could read
    // 2, 2 on one load and appear reordered on the next. Ranks are settled
    // server-side on publish, so this column is always populated by the time a
    // teacher gets here.
    queryFn: () => resultsService.list({ test: tId, page, ordering: 'rank' }),
    enabled: !!testId,
    placeholderData: keepPreviousData,
  });

  const publishMutation = useMutation({
    mutationFn: ({ id, publish }: { id: number; publish: boolean }) =>
      resultsService.publish(id, publish),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-results', tId] });
    },
  });

  const publishBulkMutation = useMutation({
    mutationFn: (assignmentId: number) => resultsService.publishBulk(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-results', tId] });
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1;

  // Try to find the first assignment to allow bulk publish
  const firstAssignment = data?.results[0]?.assignment;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-[20px] p-6 shadow-xs border border-slate-200/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Award className="h-7 w-7 text-indigo-600" />
            Class Results
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 leading-relaxed font-medium">
            {test ? `Results for "${test.title}"` : 'Loading...'}
          </p>
        </div>
        {firstAssignment && (
          <Button
            variant="gradient"
            disabled={publishBulkMutation.isPending}
            onClick={() => publishBulkMutation.mutate(firstAssignment)}
            className="shrink-0"
          >
            {publishBulkMutation.isPending ? 'Publishing...' : 'Publish All Results'}
          </Button>
        )}
      </div>

      <div className="border border-slate-200/60 rounded-2xl overflow-hidden shadow-xs bg-white">
        {isLoading ? (
          <div className="py-12">
            <Spinner label="Loading results..." />
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-sm text-destructive">
            Failed to load results.
          </div>
        ) : data && data.results.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No results found for this test. Results are created when students submit their exams.
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-16 text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">S.No</TableHead>
                <TableHead className="w-12 text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Rank</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Student</TableHead>
                <TableHead className="text-right text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Marks</TableHead>
                <TableHead className="text-right text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Percentage</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Status</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Published</TableHead>
                <TableHead className="text-right text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.results.map((r, index) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground tabular-nums font-semibold py-3.5">{(page - 1) * 20 + index + 1}</TableCell>
                  <TableCell className="text-muted-foreground font-semibold py-3.5">{r.rank ?? '--'}</TableCell>
                  <TableCell className="py-3.5">
                    <div className="font-bold text-slate-900">{r.student_name}</div>
                    <div className="text-xs text-muted-foreground">{r.student_email}</div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-indigo-600 py-3.5">
                    {parseFloat(r.obtained_marks).toFixed(1)} / {parseFloat(r.total_marks).toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-emerald-600 py-3.5">
                    {parseFloat(r.percentage).toFixed(1)}%
                  </TableCell>
                  <TableCell className="py-3.5">
                    <Badge variant={r.passed ? 'success' : 'destructive'}>
                      {r.passed ? 'Pass' : 'Fail'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <Badge variant={r.is_published ? 'success' : 'secondary'}>
                      {r.is_published ? 'Published' : 'Unpublished'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-3.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={publishMutation.isPending}
                      onClick={() =>
                        publishMutation.mutate({ id: r.id, publish: !r.is_published })
                      }
                      aria-label={r.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {r.is_published ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
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
            Page {page} of {totalPages} -- {data.count} total
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
    </div>
  );
}
