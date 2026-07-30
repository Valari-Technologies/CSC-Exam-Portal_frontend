import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
import { reportsService } from '@/services/reports.service';

export default function ClassReportPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reports', 'class', dateFrom, dateTo],
    queryFn: () =>
      reportsService.classReport({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Class Performance Report</h1>
        <p className="text-sm text-muted-foreground">
          Aggregated performance data across all classes.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="date-from">Date From</Label>
          <Input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="date-to">Date To</Label>
          <Input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-44"
          />
        </div>
        {(dateFrom || dateTo) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="py-12">
            <Spinner label="Loading class report..." />
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-sm text-destructive">
            Failed to load class report.
          </div>
        ) : data && data.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No class data available yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">S.No</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Total Students</TableHead>
                <TableHead className="text-right">Avg Percentage</TableHead>
                <TableHead className="text-right">Pass Count</TableHead>
                <TableHead className="text-right">Fail Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((row, index) => (
                <TableRow key={row.class_id}>
                  <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
                  <TableCell className="font-medium">{row.class_name}</TableCell>
                  <TableCell className="text-right">{row.total_students}</TableCell>
                  <TableCell className="text-right">
                    {row.avg_percentage !== null
                      ? `${parseFloat(row.avg_percentage).toFixed(1)}%`
                      : '--'}
                  </TableCell>
                  <TableCell className="text-right">{row.pass_count}</TableCell>
                  <TableCell className="text-right">{row.fail_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
