import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { classesService, subjectsService, chaptersService } from '@/services/academics.service';
import { classLabel } from '@/lib/utils';
import type { Question, QuestionWriteRequest } from '@/types';
import { CustomSelect } from '@/components/ui/CustomSelect';

const questionSchema = z.object({
  subject: z.coerce.number().int().positive('Select a subject'),
  chapter: z.coerce.number().int().positive('Select a chapter'),
  lesson: z.string().optional().default(''),
  question_text: z.string().min(1, 'Question text is required'),
  option_a: z.string().min(1, 'Option A is required').max(500),
  option_b: z.string().min(1, 'Option B is required').max(500),
  option_c: z.string().min(1, 'Option C is required').max(500),
  option_d: z.string().min(1, 'Option D is required').max(500),
  correct_option: z.enum(['a', 'b', 'c', 'd'], { required_error: 'Select the correct option' }),
  explanation: z.string().optional().default(''),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  marks: z.coerce.number().min(0, 'Marks must be >= 0'),
  negative_marks: z.coerce.number().min(0, 'Negative marks must be >= 0'),
  is_active: z.boolean(),
});

type QuestionFormValues = z.infer<typeof questionSchema>;

interface QuestionFormProps {
  initialData?: Question;
  onSubmit: (data: QuestionWriteRequest) => Promise<void>;
  isSubmitting: boolean;
  title: string;
}

export default function QuestionForm({ initialData, onSubmit, isSubmitting, title }: QuestionFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      subject: 0,
      chapter: 0,
      lesson: '',
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_option: undefined,
      explanation: '',
      difficulty: 'medium',
      marks: 1,
      negative_marks: 0,
      is_active: true,
    },
  });

  const selectedSubject = watch('subject');
  const selectedChapter = watch('chapter');

  // Class is a UI-only filter for the Subject dropdown — a question's FK is the subject,
  // which already carries its class. Same pattern as the New Chapter dialog.
  const [selectedClass, setSelectedClass] = useState(0);

  const classesQuery = useQuery({
    queryKey: ['classes-dropdown'],
    queryFn: () => classesService.list({ page_size: 200 }),
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects-dropdown'],
    queryFn: () => subjectsService.list({ page_size: 200 }),
  });

  const chaptersQuery = useQuery({
    queryKey: ['chapters-dropdown', selectedSubject],
    queryFn: () => chaptersService.list({ subject: selectedSubject, page_size: 200 }),
    enabled: !!selectedSubject && selectedSubject > 0,
  });

  const selectedChapterObj = useMemo(() => {
    if (!selectedChapter || !chaptersQuery.data?.results) return null;
    return chaptersQuery.data.results.find((ch) => ch.id === selectedChapter);
  }, [selectedChapter, chaptersQuery.data]);

  const chapterLessons = selectedChapterObj?.lessons || [];

  const allSubjects = useMemo(() => subjectsQuery.data?.results ?? [], [subjectsQuery.data]);

  // Subjects of the chosen class only — this is what splits the old combined
  // "Mathematics (10)" option into independent Class and Subject fields.
  const subjectsForClass = useMemo(
    () => allSubjects.filter((s) => s.school_class === selectedClass),
    [allSubjects, selectedClass],
  );

  // The Subject ID (e.g. KA_MAT_10) of the chosen subject — generated server-side, so it
  // is displayed read-only and never submitted. It encodes both the class and the subject,
  // which is why it only resolves once a subject is picked.
  const subjectCode = useMemo(
    () => allSubjects.find((s) => s.id === selectedSubject)?.code ?? '',
    [allSubjects, selectedSubject],
  );

  // When editing, derive the Class field from the question's existing subject; the
  // subject list may arrive after initialData, so this keys off both.
  useEffect(() => {
    if (!initialData) return;
    const subject = allSubjects.find((s) => s.id === initialData.subject);
    if (subject) setSelectedClass(subject.school_class);
  }, [initialData, allSubjects]);

  useEffect(() => {
    if (initialData) {
      reset({
        subject: initialData.subject,
        chapter: initialData.chapter,
        lesson: initialData.lesson || '',
        question_text: initialData.question_text,
        option_a: initialData.option_a,
        option_b: initialData.option_b,
        option_c: initialData.option_c,
        option_d: initialData.option_d,
        correct_option: initialData.correct_option,
        explanation: initialData.explanation,
        difficulty: initialData.difficulty,
        marks: Number(initialData.marks),
        negative_marks: Number(initialData.negative_marks),
        is_active: initialData.is_active,
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: QuestionFormValues) => {
    try {
      const payload: QuestionWriteRequest = {
        subject: data.subject,
        chapter: data.chapter,
        lesson: data.lesson ?? '',
        question_text: data.question_text,
        option_a: data.option_a,
        option_b: data.option_b,
        option_c: data.option_c,
        option_d: data.option_d,
        correct_option: data.correct_option,
        explanation: data.explanation ?? '',
        difficulty: data.difficulty,
        marks: data.marks,
        negative_marks: data.negative_marks,
        is_active: data.is_active,
      };
      await onSubmit(payload);
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const serverErrors = err.response.data as Record<string, string[]>;
        for (const [field, messages] of Object.entries(serverErrors)) {
          if (field in questionSchema.shape) {
            setError(field as keyof QuestionFormValues, {
              message: Array.isArray(messages) ? messages[0] : String(messages),
            });
          }
        }
      }
    }
  };



  return (
    <div className="max-w-3xl bg-[#F1EFFE] rounded-[20px] border border-slate-200/60 p-6 md:p-8 shadow-xs">
      <div className="border-b border-slate-100 pb-5 mb-6">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
        <p className="text-slate-500 text-sm mt-1 font-medium">Specify the question content, choices, difficulty, and marks allocation.</p>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6" noValidate>
        {/* Class → Subject → Subject ID (cascading), then Chapter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="school_class" className="text-xs font-black text-slate-550 uppercase tracking-wider">Class</Label>
            <CustomSelect
              options={[
                { value: '0', label: 'Select class' },
                ...(classesQuery.data?.results.map((c) => ({ value: String(c.id), label: classLabel(c) })) || [])
              ]}
              value={String(selectedClass)}
              onChange={(val) => {
                setSelectedClass(Number(val));
                setValue('subject', 0);
                setValue('chapter', 0);
              }}
              containerClassName="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="text-xs font-black text-slate-550 uppercase tracking-wider">Subject</Label>
            <CustomSelect
              options={[
                { value: '0', label: selectedClass === 0 ? 'Select class first' : 'Select subject' },
                ...(subjectsForClass.map((s) => ({ value: String(s.id), label: s.name })) || [])
              ]}
              value={String(selectedSubject ?? 0)}
              disabled={selectedClass === 0}
              onChange={(val) => {
                setValue('subject', Number(val));
                setValue('chapter', 0);
              }}
              containerClassName="w-full"
            />
            {errors.subject && <p className="text-xs text-destructive font-medium mt-1">{errors.subject.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject_id" className="text-xs font-black text-slate-550 uppercase tracking-wider">Subject ID</Label>
            <p
              id="subject_id"
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-100 bg-slate-50/50 text-sm font-mono font-bold text-slate-500 truncate"
            >
              {subjectCode || '—'}
            </p>
            <p className="text-[11px] text-slate-400 font-medium">Generated automatically</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="chapter" className="text-xs font-black text-slate-550 uppercase tracking-wider">Chapter</Label>
            <CustomSelect
              options={[
                { value: '0', label: 'Select chapter' },
                ...(chaptersQuery.data?.results.map((ch) => ({ value: String(ch.id), label: ch.name })) || [])
              ]}
              value={String(watch('chapter') ?? 0)}
              disabled={!selectedSubject || selectedSubject === 0}
              onChange={(val) => {
                setValue('chapter', Number(val));
                setValue('lesson', '');
              }}
              containerClassName="w-full"
            />
            {errors.chapter && <p className="text-xs text-destructive font-medium mt-1">{errors.chapter.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson" className="text-xs font-black text-slate-550 uppercase tracking-wider">Lesson (Optional)</Label>
            <CustomSelect
              options={[
                { value: '', label: chapterLessons.length === 0 ? 'No lessons in this chapter' : 'Select lesson' },
                ...chapterLessons.map((l) => ({ value: l, label: l }))
              ]}
              value={watch('lesson') ?? ''}
              disabled={!watch('chapter') || watch('chapter') === 0 || chapterLessons.length === 0}
              onChange={(val) => setValue('lesson', val)}
              containerClassName="w-full"
            />
            {errors.lesson && <p className="text-xs text-destructive font-medium mt-1">{errors.lesson.message}</p>}
          </div>
        </div>

        {/* Question text */}
        <div className="space-y-2">
          <Label htmlFor="question_text" className="text-xs font-black text-slate-550 uppercase tracking-wider">Question Text</Label>
          <textarea
            id="question_text"
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
            {...register('question_text')}
          />
          {errors.question_text && (
            <p className="text-xs text-destructive font-medium mt-1">{errors.question_text.message}</p>
          )}
        </div>

        {/* Options A-D with radio for correct answer */}
        <fieldset className="space-y-3">
          <legend className="text-xs font-black text-slate-550 uppercase tracking-wider mb-2">Options (select the correct one)</legend>
          {([
            { key: 'a', field: 'option_a' as const },
            { key: 'b', field: 'option_b' as const },
            { key: 'c', field: 'option_c' as const },
            { key: 'd', field: 'option_d' as const },
          ]).map(({ key, field }) => (
            <div key={key} className="flex items-start gap-3 bg-slate-50/30 p-3 rounded-xl border border-slate-200/50 hover:bg-slate-50 transition-colors">
              <div className="pt-2">
                <input
                  type="radio"
                  id={`correct_${key}`}
                  value={key}
                  {...register('correct_option')}
                  className="h-4.5 w-4.5 accent-indigo-600 cursor-pointer"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor={field} className="text-xs font-bold text-slate-700 cursor-pointer">
                  Option {key.toUpperCase()}
                </Label>
                <input
                  id={field}
                  type="text"
                  placeholder={`Enter option ${key.toUpperCase()}`}
                  {...register(field)}
                  className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
                />
                {errors[field] && (
                  <p className="text-xs text-destructive font-medium mt-1">{errors[field]?.message}</p>
                )}
              </div>
            </div>
          ))}
          {errors.correct_option && (
            <p className="text-xs text-destructive font-medium mt-1">{errors.correct_option.message}</p>
          )}
        </fieldset>

        {/* Explanation */}
        <div className="space-y-2">
          <Label htmlFor="explanation" className="text-xs font-black text-slate-550 uppercase tracking-wider">Explanation (optional)</Label>
          <textarea
            id="explanation"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
            {...register('explanation')}
          />
        </div>

        {/* Difficulty, Marks, Negative Marks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="difficulty" className="text-xs font-black text-slate-550 uppercase tracking-wider">Difficulty</Label>
            <input type="hidden" {...register('difficulty')} />
            <CustomSelect
              options={[
                { value: 'easy', label: 'Easy' },
                { value: 'medium', label: 'Medium' },
                { value: 'hard', label: 'Hard' },
              ]}
              value={watch('difficulty') ?? 'medium'}
              onChange={(val) => setValue('difficulty', val as 'easy' | 'medium' | 'hard')}
              containerClassName="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="marks" className="text-xs font-black text-slate-550 uppercase tracking-wider">Marks</Label>
            <input
              id="marks"
              type="number"
              step="0.01"
              min="0"
              {...register('marks')}
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
            />
            {errors.marks && <p className="text-xs text-destructive font-medium mt-1">{errors.marks.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="negative_marks" className="text-xs font-black text-slate-550 uppercase tracking-wider">Negative Marks</Label>
            <input
              id="negative_marks"
              type="number"
              step="0.01"
              min="0"
              {...register('negative_marks')}
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
            />
            {errors.negative_marks && (
              <p className="text-xs text-destructive font-medium mt-1">{errors.negative_marks.message}</p>
            )}
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-2 bg-slate-50/50 p-3 rounded-xl border border-slate-200/40 w-fit">
          <input
            type="checkbox"
            id="is_active"
            {...register('is_active')}
            className="h-4.5 w-4.5 accent-indigo-600 cursor-pointer"
          />
          <Label htmlFor="is_active" className="text-sm font-bold text-slate-700 cursor-pointer select-none">Active</Label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button type="submit" variant="gradient" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : initialData ? 'Update Question' : 'Create Question'}
          </Button>
        </div>
      </form>
    </div>
  );
}
