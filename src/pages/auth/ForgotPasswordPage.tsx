import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { AuthShell } from '@/components/auth/AuthShell';
import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth.service';

const schema = z.object({
  email: z.string().email('Enter a valid email address.'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setError(null);
      await authService.requestPasswordReset(values.email);
      setSubmitted(true);
    } catch (err: any) {
      const message =
        err.response?.data?.detail || 'Failed to send reset link. Please try again later.';
      setError(message);
    }
  };

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a link to reset it."
      footer={
        <Link to="/login" className="text-primary hover:underline font-medium">
          Back to sign in
        </Link>
      }
    >
      {submitted ? (
        <div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          If an account exists for that email, a reset link has been sent. Please check your inbox
          (and spam folder).
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <AnimatedInput
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@school.edu"
            error={errors.email?.message}
            {...register('email')}
          />

          <Button type="submit" variant="gradient" size="lg" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
