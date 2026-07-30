import { ReactNode } from 'react';
import { MeshBackground } from '@/components/ui/MeshBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageWrapper } from '@/components/ui/PageWrapper';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <PageWrapper>
      <MeshBackground />
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="w-full max-w-md">
          <h1 className="text-2xl font-bold mb-1">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mb-6">{subtitle}</p>}
          <div className={subtitle ? '' : 'mt-2'}>{children}</div>
          {footer && <div className="mt-6 text-center text-sm">{footer}</div>}
        </GlassCard>
      </div>
    </PageWrapper>
  );
}
