import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { Button } from '@/components/ui/Button';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { classesService, subjectsService } from '@/services/academics.service';
import { classLabel } from '@/lib/utils';
import type { TestDetail, TestWriteRequest } from '@/types';

// Every message here has a counterpart on the API (TestWriteSerializer): the numeric
// fields carry a model default of 0, so the serializer marks them required explicitly.
// Keep the two in step — a frontend-only rule silently passes direct API calls, and a
// backend-only rule surfaces as an unexplained 400.
// NOT z.coerce.number(): a cleared number input hands zod the empty string, and
// Number('') is 0 — so a blank Total Marks would coerce to a valid 0 and create a
// zero-mark test. Map empty/null to undefined first so "required" actually fires.
// Constraints go INSIDE the preprocess: z.preprocess returns a ZodEffects, which has no
// .min()/.int() to chain onto.
const requiredNumber = (label: string, constrain?: (schema: z.ZodNumber) => z.ZodNumber) => {
  const base = z.number({
    required_error: `${label} is required`,
    invalid_type_error: `${label} is required`,
  });
  return z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    constrain ? constrain(base) : base,
  );
};

const testObjectSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional().default(''),
  subject: z.number({ required_error: 'Subject is required', invalid_type_error: 'Subject is required' }),
  school_class: z.number({ required_error: 'Class is required', invalid_type_error: 'Class is required' }),
  // A zero-mark test is never valid, so total must be > 0. Passing marks of 0 IS
  // legitimate ("everyone passes"), so that one only has to be present.
  total_marks: requiredNumber('Total marks', (s) =>
    s.gt(0, 'Total marks must be greater than 0')),
  passing_marks: requiredNumber('Passing marks', (s) =>
    s.min(0, 'Passing marks cannot be negative')),
  duration_minutes: requiredNumber('Duration', (s) =>
    s.int('Duration must be a whole number').min(1, 'Duration must be at least 1 minute')),
  instructions: z.string().optional().default(''),
  shuffle_questions: z.boolean().default(false),
  shuffle_options: z.boolean().default(false),
  show_result_immediately: z.boolean().default(false),
  allow_review_after_submit: z.boolean().default(true),
});

const testSchema = testObjectSchema.refine((data) => data.passing_marks <= data.total_marks, {
  message: 'Passing marks cannot exceed total marks',
  path: ['passing_marks'],
});

type TestFormValues = z.infer<typeof testSchema>;

interface TestFormProps {
  initialData?: TestDetail;
  onSubmit: (data: TestWriteRequest) => Promise<void>;
  isSubmitting: boolean;
  title: string;
}

export default function TestForm({ initialData, onSubmit, isSubmitting, title }: TestFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TestFormValues>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      title: '',
      description: '',
      subject: undefined,
      school_class: undefined,
      total_marks: undefined as unknown as number,
      passing_marks: undefined as unknown as number,
      duration_minutes: 30,
      instructions: '',
      shuffle_questions: false,
      shuffle_options: false,
      show_result_immediately: false,
      allow_review_after_submit: true,
    },
  });

  const selectedClass = watch('school_class');

  const classesQuery = useQuery({
    queryKey: ['classes-dropdown'],
    queryFn: () => classesService.list({ page_size: 100 }),
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects-dropdown', selectedClass],
    queryFn: () => subjectsService.list({ school_class: selectedClass, page_size: 100 }),
    enabled: !!selectedClass,
  });

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        description: initialData.description,
        subject: initialData.subject,
        school_class: initialData.school_class,
        total_marks: Number(initialData.total_marks),
        passing_marks: Number(initialData.passing_marks),
        duration_minutes: initialData.duration_minutes,
        instructions: initialData.instructions,
        shuffle_questions: initialData.shuffle_questions,
        shuffle_options: initialData.shuffle_options,
        show_result_immediately: initialData.show_result_immediately,
        allow_review_after_submit: initialData.allow_review_after_submit,
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: TestFormValues) => {
    try {
      const payload: TestWriteRequest = {
        title: data.title,
        description: data.description || '',
        subject: data.subject,
        school_class: data.school_class,
        total_marks: data.total_marks,
        passing_marks: data.passing_marks,
        duration_minutes: data.duration_minutes,
        instructions: data.instructions || '',
        shuffle_questions: data.shuffle_questions,
        shuffle_options: data.shuffle_options,
        show_result_immediately: data.show_result_immediately,
        allow_review_after_submit: data.allow_review_after_submit,
      };
      await onSubmit(payload);
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const serverErrors = err.response.data as Record<string, string[]>;
        for (const [field, messages] of Object.entries(serverErrors)) {
          if (field in testObjectSchema.shape) {
            setError(field as keyof TestFormValues, {
              message: Array.isArray(messages) ? messages[0] : String(messages),
            });
          }
        }
      }
    }
  };

  return (
    <Card className="max-w-2xl bg-[#F1EFFE]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
            <Input id="title" {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description <span className="text-muted-foreground font-normal">(Optional)</span></Label>
            <textarea
              id="description"
              {...register('description')}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="school_class">Class <span className="text-destructive">*</span></Label>
              <CustomSelect
                options={[
                  { value: '', label: 'Select class' },
                  ...(classesQuery.data?.results.map((c) => ({ value: String(c.id), label: classLabel(c) })) || [])
                ]}
                value={String(selectedClass ?? '')}
                onChange={(val) => {
                  const v = val ? Number(val) : undefined;
                  setValue('school_class', v as number);
                  setValue('subject', undefined as unknown as number);
                }}
                containerClassName="w-full"
              />
              {errors.school_class && <p className="text-xs text-destructive">{errors.school_class.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject <span className="text-destructive">*</span></Label>
              <CustomSelect
                options={[
                  { value: '', label: 'Select subject' },
                  ...(subjectsQuery.data?.results.map((s) => ({ value: String(s.id), label: s.name })) || [])
                ]}
                value={String(watch('subject') ?? '')}
                disabled={!selectedClass}
                onChange={(val) => setValue('subject', Number(val))}
                containerClassName="w-full"
              />
              {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="duration_minutes">Duration (Minutes) <span className="text-destructive">*</span></Label>
              <Input id="duration_minutes" type="number" min={1} {...register('duration_minutes')} />
              {errors.duration_minutes && <p className="text-xs text-destructive">{errors.duration_minutes.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="total_marks">Total Marks <span className="text-destructive">*</span></Label>
              <Input id="total_marks" type="number" min={0} step="0.01" {...register('total_marks')} />
              {errors.total_marks && <p className="text-xs text-destructive">{errors.total_marks.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="passing_marks">Passing Marks <span className="text-destructive">*</span></Label>
              <Input id="passing_marks" type="number" min={0} step="0.01" {...register('passing_marks')} />
              {errors.passing_marks && <p className="text-xs text-destructive">{errors.passing_marks.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="instructions">Instructions <span className="text-muted-foreground font-normal">(Optional)</span></Label>
            <textarea
              id="instructions"
              {...register('instructions')}
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Instructions for students taking this test..."
            />
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-base">Settings</Label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('shuffle_questions')} className="rounded border-input" />
                Shuffle questions
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('shuffle_options')} className="rounded border-input" />
                Shuffle options
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('show_result_immediately')} className="rounded border-input" />
                Show result immediately after submission
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('allow_review_after_submit')} className="rounded border-input" />
                Allow review after submission
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
            <Button type="submit" variant="gradient" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : initialData ? 'Update Test' : 'Create Test'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
