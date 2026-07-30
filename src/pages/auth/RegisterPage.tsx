import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';

import { AuthShell } from '@/components/auth/AuthShell';
import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { passwordField } from '@/lib/password';

const registerSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters.'),
  email: z.string().email('Enter a valid email address.'),
  school_code: z.string().min(2, 'School code is required.'),
  password: passwordField,
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match.',
  path: ['confirm_password'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

type FieldErrors = Partial<Record<keyof RegisterFormValues | 'detail', string | string[]>>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: '',
      email: '',
      school_code: '',
      password: '',
      confirm_password: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setFormError(null);
    try {
      await registerUser({
        full_name: values.full_name,
        email: values.email,
        school_code: values.school_code,
        password: values.password,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data as FieldErrors;
        let handled = false;
        (['email', 'school_code', 'password', 'full_name'] as const).forEach((field) => {
          const value = data[field];
          if (value) {
            const message = Array.isArray(value) ? value.join(' ') : value;
            setError(field, { type: 'server', message });
            handled = true;
          }
        });
        if (!handled) {
          const detail = data.detail;
          setFormError(typeof detail === 'string' ? detail : 'Registration failed.');
        }
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <AuthShell
      title="Create your school admin account"
      subtitle="Register your school's primary admin. Use the unique school code provided by CSC."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <AnimatedInput
          label="Full name"
          autoComplete="name"
          placeholder="Jane Doe"
          error={errors.full_name?.message}
          {...register('full_name')}
        />
        <AnimatedInput
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="admin@school.edu"
          error={errors.email?.message}
          {...register('email')}
        />
        <AnimatedInput
          label="School code"
          autoComplete="off"
          placeholder="e.g. CSC-MUM-001"
          error={errors.school_code?.message}
          {...register('school_code')}
        />
        <AnimatedInput
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register('password')}
        />
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
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  );
}
