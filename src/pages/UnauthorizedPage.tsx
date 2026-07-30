import { Link } from 'react-router-dom';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { Button } from '@/components/ui/Button';

export default function UnauthorizedPage() {
  return (
    <PageWrapper>
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-3xl font-bold">403 — Unauthorized</h1>
        <p className="text-muted-foreground">You don&apos;t have permission to view this page.</p>
        <Button asChild>
          <Link to="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </PageWrapper>
  );
}
