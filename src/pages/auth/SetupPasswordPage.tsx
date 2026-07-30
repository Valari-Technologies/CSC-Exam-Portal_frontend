import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { AuthShell } from '@/components/auth/AuthShell';
import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth.service';
import { PASSWORD_RULES_HINT, extractApiError, passwordField } from '@/lib/password';

const schema = z.object({
  password: passwordField,
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match.',
  path: ['confirm_password'],
});

type FormValues = z.infer<typeof schema>;

export default function SetupPasswordPage() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid') ?? '';
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm_password: '' },
  });

  const linkInvalid = !uid || !token;

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      await authService.setupPassword(uid, token, values.password);
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      // A rejected password comes back as {"new_password": [...]}, not {"detail": ...} —
      // reading only `detail` used to report an expired link for a too-short password.
      setFormError(extractApiError(err, 'Setup link is invalid or has expired.'));
    }
  };

  return (
    <AuthShell
      title="Set up your password"
      subtitle={linkInvalid ? undefined : 'Create a password to start using the CSC Exam Portal.'}
      footer={
        <Link to="/login" className="text-primary hover:underline font-medium">
          Already have a password? Sign in
        </Link>
      }
    >
      {linkInvalid ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          This setup link is missing required information. Please contact your school admin.
        </div>
      ) : success ? (
        <div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          Password set successfully! Redirecting to sign in…
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <AnimatedInput
            label="New password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            error={errors.password?.message}
            {...register('password')}
          />
          {!errors.password && (
            <p className="text-xs text-muted-foreground -mt-2">{PASSWORD_RULES_HINT}</p>
          )}
          <AnimatedInput
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter password"
            error={errors.confirm_password?.message}
            {...register('confirm_password')}
          />

          {formError && (
            <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
              {formError}
            </p>
          )}

          <Button type="submit" variant="gradient" size="lg" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Setting up…' : 'Set password & continue'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
