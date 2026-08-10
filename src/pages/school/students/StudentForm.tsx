import { useEffect, useState } from 'react';
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
import { classLabel } from '@/lib/utils';
import { PASSWORD_RULES_HINT, generatePassword, optionalPasswordField } from '@/lib/password';
import { useAuth } from '@/hooks/useAuth';
import { classesService, sectionsService } from '@/services/academics.service';
import { isStandardSection } from '@/lib/sections';
import { schoolsService } from '@/services/schools.service';
import { studentsService } from '@/services/students.service';
import type { StudentProfileDetail, StudentWriteRequest } from '@/types';

const studentSchema = z.object({
  // Optional: students sign in with a Student ID, so an email is contact information
  // rather than a credential. Blank is allowed; anything typed must still be an email.
  email: z.union([z.string().email('Valid email required'), z.literal('')]).optional(),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  student_id: z.string().optional(),
  // Blank means "auto-generate" (create) or "keep the current password" (edit); anything
  // typed must satisfy the same policy the server enforces.
  password: optionalPasswordField,
  school: z.number().optional(),
  school_class: z.number({ required_error: 'Class is required' }),
  section: z.number({ required_error: 'Section is required' }),
  roll_number: z.string().min(1, 'Roll number is required'),
  admission_number: z.string().min(1, 'Admission number is required'),
  sub_section_code: z.string().optional().nullable(),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Gender is required'),
  parent_name: z.string().min(1, 'Parent name is required'),
  parent_phone: z.string().min(1, 'Parent phone is required'),
  is_active: z.boolean().default(true),
});

// Add Student: every field required. Login credentials auto-generate or must be typed.
const createStudentSchema = studentSchema.superRefine((val, ctx) => {
  const required: [keyof z.infer<typeof studentSchema>, string][] = [
    ['student_id', 'Student ID is required'],
    ['password', 'Password is required'],
  ];
  for (const [field, message] of required) {
    if (!val[field]) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
    }
  }
});

type StudentFormValues = z.infer<typeof studentSchema>;



// Password generation and policy live in @/lib/password — the single frontend mirror of
// the server rules. This form used to carry its own 12-character copy, which silently
// drifted when the policy changed.

interface StudentFormProps {
  initialData?: StudentProfileDetail;
  onSubmit: (data: StudentWriteRequest) => Promise<void>;
  isSubmitting: boolean;
  title: string;
}

export default function StudentForm({ initialData, onSubmit, isSubmitting, title }: StudentFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StudentFormValues>({
    // Stricter rules when adding; lenient when editing (see schema comments).
    resolver: zodResolver(initialData ? studentSchema : createStudentSchema),
    defaultValues: {
      email: '',
      full_name: '',
      student_id: '',
      password: '',
      school: undefined,
      school_class: undefined,
      section: undefined,
      roll_number: '',
      admission_number: '',
      sub_section_code: null,
      date_of_birth: '',
      gender: '',
      parent_name: '',
      parent_phone: '',
      is_active: true,
    },
  });

  const { user } = useAuth();
  const isCSCAdmin = user?.role === 'csc_admin';
  // Teachers may edit a student's details but not their sign-in credentials: the Student
  // ID "Generate" button calls an admin-only endpoint, and password resets are an admin
  // task. Blank student_id/password mean "leave unchanged" on update, so omitting the
  // whole block submits cleanly.
  const canEditCredentials = user?.role !== 'teacher';

  const selectedSchool = watch('school');
  const selectedClass = watch('school_class');
  const selectedSection = watch('section');

  // CSC Admin must pick a school first; the rest of the form is gated on it.
  const formReady = !isCSCAdmin || !!selectedSchool;

  const schoolsQuery = useQuery({
    queryKey: ['schools-dropdown'],
    queryFn: () => schoolsService.list({ page_size: 100 }),
    enabled: isCSCAdmin,
  });

  const classesQuery = useQuery({
    queryKey: ['classes-dropdown', selectedSchool],
    queryFn: () => classesService.list({ page_size: 100, school: isCSCAdmin ? selectedSchool : undefined }),
    enabled: !isCSCAdmin || !!selectedSchool,
  });

  const sectionsQuery = useQuery({
    queryKey: ['sections-dropdown', selectedClass],
    queryFn: () => sectionsService.list({ school_class: selectedClass, page_size: 100 }),
    enabled: !!selectedClass,
  });

  // Only A-F may be picked. The API returns whatever sections exist for the class, and the
  // Section model accepts any name, so anything outside the supported range is filtered
  // out here rather than trusted away. The student's CURRENT section is always kept, even
  // if it is out of range: dropping it would make the select fall back to "Select section"
  // and a save would silently move the student.
  const sectionOptions = (sectionsQuery.data?.results ?? []).filter(
    (s) => isStandardSection(s.name) || s.id === selectedSection,
  );

  const selectedSectionName = sectionsQuery.data?.results.find(
    (s) => s.id === selectedSection,
  )?.name?.toUpperCase();

  const showSubSection = selectedSectionName === 'A' || selectedSectionName === 'B' || selectedSectionName === 'C';

  useEffect(() => {
    if (!showSubSection) {
      setValue('sub_section_code', null);
    }
  }, [showSubSection, setValue]);

  useEffect(() => {
    if (initialData) {
      reset({
        email: initialData.user.email ?? '',
        full_name: initialData.user.full_name,
        student_id: initialData.student_id ?? '',
        // Never prefilled — we only ever hold a hash. Blank means "leave unchanged".
        password: '',
        school: initialData.school,
        school_class: initialData.school_class,
        section: initialData.section,
        roll_number: initialData.roll_number,
        admission_number: initialData.admission_number,
        sub_section_code: initialData.sub_section_code || null,
        date_of_birth: initialData.date_of_birth || '',
        gender: initialData.gender,
        parent_name: initialData.parent_name,
        parent_phone: initialData.parent_phone,
        is_active: initialData.is_active,
      });
    }
  }, [initialData, reset]);

  const [isGeneratingId, setIsGeneratingId] = useState(false);

  const handleGenerateStudentId = async () => {
    setIsGeneratingId(true);
    try {
      const nextId = await studentsService.nextStudentId(isCSCAdmin ? selectedSchool : undefined);
      setValue('student_id', nextId, { shouldValidate: true });
    } catch {
      setError('student_id', { message: 'Could not generate an ID. Enter one manually.' });
    } finally {
      setIsGeneratingId(false);
    }
  };

  // Auto-generate credentials on mount/school selection if creating a student
  useEffect(() => {
    if (!initialData) {
      if (!isCSCAdmin || selectedSchool) {
        handleGenerateStudentId();
      }
    }
  }, [initialData, selectedSchool, isCSCAdmin]);

  useEffect(() => {
    if (!initialData) {
      setValue('password', generatePassword(), { shouldValidate: true });
    }
  }, [initialData]);

  const handleFormSubmit = async (data: StudentFormValues) => {
    try {
      const payload: StudentWriteRequest = {
        // Blank is sent as null, not '': the column is unique, so a second student
        // storing '' would collide. Null means "no email on file".
        email: data.email?.trim() ? data.email.trim() : null,
        full_name: data.full_name,
        // Blank is meaningful: the server generates on create, and leaves the existing
        // value untouched on edit.
        student_id: data.student_id?.trim() ?? '',
        password: data.password ?? '',
        school: data.school,
        school_class: data.school_class,
        section: data.section,
        roll_number: data.roll_number,
        admission_number: data.admission_number,
        sub_section_code: data.sub_section_code || null,
        date_of_birth: data.date_of_birth || undefined,
        gender: (data.gender as StudentWriteRequest['gender']) || undefined,
        parent_name: data.parent_name,
        parent_phone: data.parent_phone,
        is_active: data.is_active,
      };
      await onSubmit(payload);
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const serverErrors = err.response.data as Record<string, string[]>;
        for (const [field, messages] of Object.entries(serverErrors)) {
          if (field in studentSchema.shape) {
            setError(field as keyof StudentFormValues, { message: Array.isArray(messages) ? messages[0] : String(messages) });
          }
        }
      }
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {isCSCAdmin && (
            <div className="space-y-1.5">
              <Label htmlFor="school">
                School <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <CustomSelect
                options={[
                  { value: '', label: 'Select school' },
                  ...(schoolsQuery.data?.results.map((s) => ({ value: String(s.id), label: s.name })) || [])
                ]}
                value={String(selectedSchool ?? '')}
                onChange={(val) => {
                  const v = val ? Number(val) : undefined;
                  setValue('school', v as number);
                  setValue('school_class', undefined as unknown as number);
                  setValue('section', undefined as unknown as number);
                  setValue('sub_section_code', null);
                }}
                containerClassName="w-full"
              />
              {errors.school && <p className="text-xs text-destructive">{errors.school.message}</p>}
              {!selectedSchool && (
                <p className="text-xs text-muted-foreground">Select a school to add a student under it.</p>
              )}
            </div>
          )}

          {formReady && (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">
                Full Name <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input id="full_name" {...register('full_name')} />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">
                Email <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email ? (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Leave blank if the student has no email — they sign in with their Student ID.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="school_class">
                Class <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <CustomSelect
                options={[
                  { value: '', label: 'Select class' },
                  ...(classesQuery.data?.results.map((c) => ({ value: String(c.id), label: classLabel(c) })) || [])
                ]}
                value={String(selectedClass ?? '')}
                onChange={(val) => {
                  setValue('school_class', Number(val));
                  setValue('section', undefined as unknown as number);
                  setValue('sub_section_code', null);
                }}
                containerClassName="w-full"
              />
              {errors.school_class && <p className="text-xs text-destructive">{errors.school_class.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="section">
                Section <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <CustomSelect
                options={[
                  { value: '', label: 'Select section' },
                  ...(sectionOptions.map((s) => ({ value: String(s.id), label: s.name })) || [])
                ]}
                value={String(selectedSection ?? '')}
                disabled={!selectedClass}
                onChange={(val) => {
                  setValue('section', Number(val));
                  setValue('sub_section_code', null);
                }}
                containerClassName="w-full"
              />
              {errors.section && <p className="text-xs text-destructive">{errors.section.message}</p>}
            </div>
            {showSubSection && (
              <div className="space-y-1.5">
                <Label htmlFor="sub_section_code">Sub-section (optional)</Label>
                <CustomSelect
                  options={[
                    { value: '', label: 'None' },
                    { value: 'a', label: 'a' },
                    { value: 'b', label: 'b' },
                    { value: 'c', label: 'c' },
                  ]}
                  value={watch('sub_section_code') ?? ''}
                  onChange={(val) => setValue('sub_section_code', val || null)}
                  containerClassName="w-full"
                />
                {errors.sub_section_code && <p className="text-xs text-destructive">{errors.sub_section_code.message}</p>}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="roll_number">
                Roll Number <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input id="roll_number" {...register('roll_number')} />
              {errors.roll_number && <p className="text-xs text-destructive">{errors.roll_number.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admission_number">
                Admission Number <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input id="admission_number" {...register('admission_number')} />
              {errors.admission_number && (
                <p className="text-xs text-destructive">{errors.admission_number.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date_of_birth">
                Date of Birth <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
              {errors.date_of_birth && (
                <p className="text-xs text-destructive">{errors.date_of_birth.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">
                Gender <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <input type="hidden" {...register('gender')} />
              <CustomSelect
                options={[
                  { value: '', label: 'Select' },
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]}
                value={watch('gender') ?? ''}
                onChange={(val) => setValue('gender', val)}
                containerClassName="w-full"
              />
              {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="parent_name">
                Parent Name <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input id="parent_name" {...register('parent_name')} />
              {errors.parent_name && (
                <p className="text-xs text-destructive">{errors.parent_name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="parent_phone">
                Parent Phone <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input id="parent_phone" {...register('parent_phone')} />
              {errors.parent_phone && (
                <p className="text-xs text-destructive">{errors.parent_phone.message}</p>
              )}
            </div>
          </div>

          <div className={`rounded-md border border-border p-4 space-y-4 ${canEditCredentials ? '' : 'hidden'}`}>
            <div>
              <h3 className="text-sm font-medium">Login Credentials</h3>
              <p className="text-xs text-muted-foreground">
                The student signs in at <code>/studentlogin</code> with these — not with their email.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="student_id">
                  Student ID <span className="ml-0.5 text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input id="student_id" placeholder="Auto-generated" {...register('student_id')} />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateStudentId}
                    disabled={isGeneratingId || (isCSCAdmin && !selectedSchool)}
                  >
                    {isGeneratingId ? '…' : 'Generate'}
                  </Button>
                </div>
                {errors.student_id && <p className="text-xs text-destructive">{errors.student_id.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">
                  Password{' '}
                  {initialData ? (
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  ) : (
                    <span className="ml-0.5 text-destructive">*</span>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    type="text"
                    autoComplete="off"
                    placeholder={initialData ? 'Leave blank to keep current' : 'Auto-generated'}
                    {...register('password')}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      // Clear any stale "too short" error — the generated one always passes.
                      setValue('password', generatePassword(), { shouldValidate: true })
                    }
                  >
                    Generate
                  </Button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                <p className="text-xs text-muted-foreground">
                  {initialData
                    ? 'Leave blank to keep the current password.'
                    : 'Shown once after saving.'}
                  {' '}
                  {PASSWORD_RULES_HINT}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" {...register('is_active')} className="rounded border-input" />
            <Label htmlFor="is_active">Active</Label>
          </div>
          </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
            {formReady && (
              <Button type="submit" variant="gradient" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : initialData ? 'Update Student' : 'Create Student'}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
