import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Spinner } from '@/components/ui/Spinner';
import { CustomSelect } from '@/components/ui/CustomSelect';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { classesService } from '@/services/academics.service';
import { reportsService } from '@/services/reports.service';
import { classLabel } from '@/lib/utils';

export default function SubjectReportPage() {
  const [selectedClass, setSelectedClass] = useState<string>('');

  const classesQuery = useQuery({
    queryKey: ['classes-for-report'],
    queryFn: () => classesService.list({ is_active: true, page_size: 100 }),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reports', 'subject', selectedClass],
    queryFn: () =>
      reportsService.subjectReport({
        school_class: selectedClass ? parseInt(selectedClass, 10) : undefined,
      }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Subject Performance Report</h1>
        <p className="text-sm text-muted-foreground">
          Performance breakdown by subject across all tests.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="class-filter">Filter by Class</Label>
          <CustomSelect
            options={[
              { value: '', label: 'All Classes' },
              ...(classesQuery.data?.results.map((cls) => ({ value: String(cls.id), label: classLabel(cls) })) || [])
            ]}
            value={selectedClass}
            onChange={(val) => setSelectedClass(val)}
            containerClassName="w-56"
          />
        </div>
        {selectedClass && (
          <Button variant="outline" size="sm" onClick={() => setSelectedClass('')}>
            Clear Filter
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="py-12">
            <Spinner label="Loading subject report..." />
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-sm text-destructive">
            Failed to load subject report.
          </div>
        ) : data && data.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No subject data available yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">S.No</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="text-right">Avg Percentage</TableHead>
                <TableHead className="text-right">Questions</TableHead>
                <TableHead className="text-right">Tests</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((row, index) => (
                <TableRow key={row.subject_id}>
                  <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
                  <TableCell className="font-medium">{row.subject_name}</TableCell>
                  <TableCell className="text-right">
                    {row.avg_percentage !== null
                      ? `${parseFloat(row.avg_percentage).toFixed(1)}%`
                      : '--'}
                  </TableCell>
                  <TableCell className="text-right">{row.question_count}</TableCell>
                  <TableCell className="text-right">{row.test_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
