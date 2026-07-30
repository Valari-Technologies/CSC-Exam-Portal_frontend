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
  student_id: z.string().min(1, 'Student ID is required.'),
});

type FormValues = z.infer<typeof schema>;

/**
 * Students sign in with a Student ID, not an email, so they can't use the staff reset form.
 * The backend resolves the Student ID to the student's own registered email and sends the
 * link there.
 */
export default function StudentForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { student_id: '' },
  });

  const onSubmit = async (values: FormValues) => {
    await authService.requestStudentPasswordReset(values.student_id.trim());
    setSubmitted(true);
  };

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your Student ID and we'll email you a reset link."
      footer={
        <Link to="/studentlogin" className="text-primary hover:underline font-medium">
          Back to student sign in
        </Link>
      }
    >
      {submitted ? (
        <div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          If that Student ID exists, a reset link has been sent to the email registered for that
          student. Please check the inbox (and spam folder). If you don't know which email is
          registered, contact your school office.
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <AnimatedInput
            label="Student ID"
            type="text"
            autoComplete="username"
            placeholder="e.g. KAR_ST_001"
            error={errors.student_id?.message}
            {...register('student_id')}
          />

          <Button type="submit" variant="gradient" size="lg" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
