import { Link } from 'react-router-dom';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <PageWrapper>
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-3xl font-bold">404 — Not Found</h1>
        <p className="text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Button asChild>
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </PageWrapper>
  );
}
