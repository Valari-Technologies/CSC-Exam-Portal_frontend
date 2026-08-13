import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, TrendingUp, Award, ArrowDown, ArrowUp, Percent, ArrowLeft } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { reportsService } from '@/services/reports.service';

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function TestReportPage() {
  const { id } = useParams<{ id: string }>();
  const testId = Number(id);
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reports', 'test', testId],
    queryFn: () => reportsService.testReport(testId),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="py-12">
        <Spinner label="Loading test report..." />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-12 text-center text-sm text-destructive">
        Failed to load test report.
      </div>
    );
  }

  const fmt = (val: string | null) =>
    val !== null ? parseFloat(val).toFixed(1) : '--';

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
        <h1 className="text-2xl font-semibold">Test Analysis</h1>
        <p className="text-sm text-muted-foreground">{data.test_title}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Students"
          value={String(data.total_students)}
          icon={Users}
        />
        <StatCard
          label="Average Marks"
          value={fmt(data.avg_marks)}
          icon={TrendingUp}
        />
        <StatCard
          label="Highest Marks"
          value={fmt(data.highest_marks)}
          icon={ArrowUp}
        />
        <StatCard
          label="Lowest Marks"
          value={fmt(data.lowest_marks)}
          icon={ArrowDown}
        />
        <StatCard
          label="Avg Percentage"
          value={data.avg_percentage !== null ? `${fmt(data.avg_percentage)}%` : '--'}
          icon={Percent}
        />
        <StatCard
          label="Pass Percentage"
          value={data.pass_percentage !== null ? `${fmt(data.pass_percentage)}%` : '--'}
          icon={Award}
        />
      </div>
    </div>
  );
}
