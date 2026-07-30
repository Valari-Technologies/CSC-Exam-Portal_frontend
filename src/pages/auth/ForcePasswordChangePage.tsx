import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { AuthShell } from '@/components/auth/AuthShell';
import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { Button } from '@/components/ui/Button';
import { PASSWORD_RULES_HINT, extractApiError, passwordField } from '@/lib/password';
import { authService } from '@/services/auth.service';
import { useAuth } from '@/hooks/useAuth';

const schema = z
  .object({
    old_password: z.string().min(1, 'Temporary password is required.'),
    new_password: passwordField,
    confirm_password: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  });

type FormValues = z.infer<typeof schema>;

/**
 * Shown when the signed-in user has must_change_password=true — i.e. an admin chose their
 * password for them. The route guard keeps them here until they replace it; the backend
 * clears the flag on a successful change.
 */
export default function ForcePasswordChangePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { old_password: '', new_password: '', confirm_password: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      await authService.changePassword(values.old_password, values.new_password);
      // A password change ends the session — the server has already blacklisted this user's
      // refresh tokens, so continuing into the app would leave a half-dead session that dies
      // at the next token refresh. Sign out and make them re-authenticate with the new
      // password. Students sign in at /studentlogin; every other role uses /login.
      await logout();
      navigate(user?.role === 'student' ? '/studentlogin' : '/login', {
        replace: true,
        state: { message: 'Your password was set. Please log in with your new password.' },
      });
    } catch (err) {
      setFormError(extractApiError(err, 'Could not change your password. Please try again.'));
    }
  };

  return (
    <AuthShell
      title="Choose your password"
      subtitle={`Welcome${user?.full_name ? `, ${user.full_name}` : ''}. Your account was created with a temporary password. Please set your own before continuing.`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <AnimatedInput
          label="Temporary password"
          type="password"
          autoComplete="current-password"
          error={errors.old_password?.message}
          {...register('old_password')}
        />
        <div className="space-y-1">
          <AnimatedInput
            label="New password"
            type="password"
            autoComplete="new-password"
            error={errors.new_password?.message}
            {...register('new_password')}
          />
          {!errors.new_password && (
            <p className="text-xs text-muted-foreground">{PASSWORD_RULES_HINT}</p>
          )}
        </div>
        <AnimatedInput
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirm_password?.message}
          {...register('confirm_password')}
        />

        {formError && (
          <p
            role="alert"
            className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2"
          >
            {formError}
          </p>
        )}

        <Button type="submit" variant="gradient" size="lg" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Saving…' : 'Set password & continue'}
        </Button>
      </form>
    </AuthShell>
  );
}
