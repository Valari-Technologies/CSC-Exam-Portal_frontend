import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { reportsService } from '@/services/reports.service';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export default function StudentReportPage() {
  const { id } = useParams<{ id: string }>();
  const studentId = Number(id);
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reports', 'student', studentId],
    queryFn: () => reportsService.studentReport(studentId),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="py-12">
        <Spinner label="Loading student report..." />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-12 text-center text-sm text-destructive">
        Failed to load student report.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs text-xs font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all w-fit cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div>
        <h1 className="text-2xl font-semibold">Student Report</h1>
        {/* A student may have no email; without the guard this renders "Ana Roy ()". */}
        <p className="text-sm text-muted-foreground">
          {data.student_email ? `${data.student_name} (${data.student_email})` : data.student_name}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_tests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Percentage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.avg_percentage !== null
                ? `${parseFloat(data.avg_percentage).toFixed(1)}%`
                : '--'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Passed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{data.total_passed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{data.total_failed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-card">
        {data.results.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No test results found for this student.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">S.No</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Marks</TableHead>
                <TableHead className="text-right">Percentage</TableHead>
                <TableHead className="text-right">Rank</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.results.map((r, index) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
                  <TableCell className="font-medium">{r.test_title}</TableCell>
                  <TableCell>{formatDate(r.calculated_at)}</TableCell>
                  <TableCell className="text-right">
                    {parseFloat(r.obtained_marks).toFixed(1)} / {parseFloat(r.total_marks).toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right">
                    {parseFloat(r.percentage).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">{r.rank ?? '--'}</TableCell>
                  <TableCell>
                    <Badge variant={r.passed ? 'success' : 'destructive'}>
                      {r.passed ? 'Pass' : 'Fail'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
