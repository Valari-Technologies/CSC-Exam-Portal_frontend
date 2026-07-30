import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { useQuery } from '@tanstack/react-query';
import { Check, Copy, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { schoolsService } from '@/services/schools.service';
import { classesService, sectionsService, subjectsService } from '@/services/academics.service';
import { GENDER_OPTIONS } from '@/types';
import type { TeacherProfileDetail, TeacherWriteRequest } from '@/types';
import AssignClassSection from './AssignClassSection';

/** A class/section/subject the admin has queued up for the new teacher, with a display label. */
interface PendingAssignment {
  school_class: number;
  section: number | null;
  subject: number | null;
  label: string;
}

// Lenient schema used when EDITING: a legacy teacher may have blank fields, and forcing
// them to be filled just to save an unrelated edit would block the edit (see item 4/5
// history with principal_name). Add Teacher uses the stricter createTeacherSchema below.
const teacherSchema = z.object({
  email: z.string().email('Valid email required'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  school: z.number().optional(),
  employee_id: z.string().optional(),
  gender: z.enum(['', 'male', 'female', 'other']).optional(),
  qualification: z.string().optional(),
  joining_date: z.string().optional(),
  // e.g. "2025-26". Stamped onto every class assignment created with the teacher.
  academic_year: z.string().optional(),
  is_active: z.boolean().default(true),
});

// Add Teacher: every field required (item 2). Enforced with a superRefine at the object
// level so the field TS types are unchanged from teacherSchema — both schemas share one
// TeacherFormValues type, so the resolver can switch between them without type conflicts.
const createTeacherSchema = teacherSchema.superRefine((val, ctx) => {
  const required: [keyof z.infer<typeof teacherSchema>, string][] = [
    ['employee_id', 'Employee ID is required'],
    ['gender', 'Gender is required'],
    ['qualification', 'Qualification is required'],
    ['joining_date', 'Joining date is required'],
  ];
  for (const [field, message] of required) {
    if (!val[field]) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
    }
  }
});

type TeacherFormValues = z.infer<typeof teacherSchema>;

interface TeacherFormProps {
  initialData?: TeacherProfileDetail;
  /**
   * On create this returns the new teacher (so the form can show its one-time setup link).
   * On edit the parent handles navigation and returns void.
   */
  onSubmit: (data: TeacherWriteRequest) => Promise<TeacherProfileDetail | void>;
  isSubmitting: boolean;
  title: string;
}

export default function TeacherForm({ initialData, onSubmit, isSubmitting, title }: TeacherFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCSCAdmin = user?.role === 'csc_admin';
  // After a successful create, hold the new teacher + one-time setup link so the School
  // Admin can copy it. Non-null switches the form over to the success panel.
  const [created, setCreated] = useState<{
    teacher: TeacherProfileDetail;
    setupLink: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  // Class/section assignments queued for a new teacher, plus the two pickers feeding them.
  const [assignments, setAssignments] = useState<PendingAssignment[]>([]);
  const [pickedClass, setPickedClass] = useState<number | ''>('');
  const [pickedSection, setPickedSection] = useState<number | ''>('');
  const [pickedSubject, setPickedSubject] = useState<number | ''>('');
  const [assignError, setAssignError] = useState<string | null>(null);

  const schoolsQuery = useQuery({
    queryKey: ['schools-dropdown'],
    queryFn: () => schoolsService.list({ page_size: 100 }),
    enabled: isCSCAdmin,
  });

  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TeacherFormValues>({
    // Stricter rules when adding; lenient when editing (see schema comments).
    resolver: zodResolver(initialData ? teacherSchema : createTeacherSchema),
    defaultValues: {
      email: '',
      full_name: '',
      school: undefined,
      employee_id: '',
      gender: '',
      qualification: '',
      joining_date: '',
      academic_year: '',
      is_active: true,
    },
  });

  // Whose classes to offer: a School Admin's own school, or the one a CSC Admin picked.
  const selectedSchool = watch('school');
  const assignmentSchoolId = isCSCAdmin ? selectedSchool : user?.school ?? undefined;

  const classesQuery = useQuery({
    queryKey: ['classes-for-assignment', assignmentSchoolId],
    queryFn: () => classesService.list({ school: assignmentSchoolId, page_size: 100 }),
    // Only needed while creating, and only once we know which school.
    enabled: !initialData && assignmentSchoolId !== undefined,
  });

  const sectionsQuery = useQuery({
    queryKey: ['sections-for-assignment', pickedClass],
    queryFn: () => sectionsService.list({ school_class: Number(pickedClass), page_size: 100 }),
    enabled: pickedClass !== '',
  });

  // A Subject row belongs to one class, so the options depend on the class picked above.
  const subjectsQuery = useQuery({
    queryKey: ['subjects-for-assignment', pickedClass],
    queryFn: () => subjectsService.list({ school_class: Number(pickedClass), page_size: 100 }),
    enabled: pickedClass !== '',
  });

  const addAssignment = () => {
    setAssignError(null);
    if (pickedClass === '') {
      setAssignError('Pick a class first.');
      return;
    }
    const classId = Number(pickedClass);
    const sectionId = pickedSection === '' ? null : Number(pickedSection);
    const subjectId = pickedSubject === '' ? null : Number(pickedSubject);
    if (
      assignments.some(
        (a) => a.school_class === classId && a.section === sectionId && a.subject === subjectId,
      )
    ) {
      setAssignError('That class, section and subject is already assigned.');
      return;
    }
    const className = classesQuery.data?.results.find((c) => c.id === classId)?.name ?? classId;
    const sectionName =
      sectionId === null
        ? 'All sections'
        : sectionsQuery.data?.results.find((s) => s.id === sectionId)?.name ?? sectionId;
    const subjectName =
      subjectId === null
        ? null
        : subjectsQuery.data?.results.find((s) => s.id === subjectId)?.name ?? subjectId;
    const label = `Class ${className} — ${sectionName}${subjectName ? ` — ${subjectName}` : ''}`;
    setAssignments((prev) => [
      ...prev,
      { school_class: classId, section: sectionId, subject: subjectId, label },
    ]);
    setPickedSection('');
    setPickedSubject('');
  };

  const removeAssignment = (index: number) =>
    setAssignments((prev) => prev.filter((_, i) => i !== index));

  // Reset the form ONCE per teacher, keyed on id — not on every `initialData` reference
  // change. The Assign Class section below invalidates the ['teacher'] query on each live
  // save, which hands this component a fresh `initialData`; resetting on that would wipe any
  // unsaved profile edits the admin is in the middle of.
  const loadedTeacherId = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (initialData && loadedTeacherId.current !== initialData.id) {
      loadedTeacherId.current = initialData.id;
      reset({
        email: initialData.user.email,
        full_name: initialData.user.full_name,
        school: initialData.school,
        employee_id: initialData.employee_id,
        gender: initialData.gender,
        qualification: initialData.qualification,
        joining_date: initialData.joining_date || '',
        // Not populated: the academic year lives on the teacher's assignments, which the
        // Assign Class section manages directly.
        academic_year: '',
        is_active: initialData.is_active,
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: TeacherFormValues) => {
    try {
      const payload: TeacherWriteRequest = {
        email: data.email,
        full_name: data.full_name,
        school: data.school,
        employee_id: data.employee_id,
        gender: data.gender,
        qualification: data.qualification,
        joining_date: data.joining_date || undefined,
        is_active: data.is_active,
        // Create only — the API rejects assignments on update.
        ...(initialData
          ? {}
          : {
              academic_year: data.academic_year || undefined,
              assignments: assignments.map((a) => ({
                school_class: a.school_class,
                section: a.section,
                subject: a.subject,
              })),
            }),
      };
      const saved = await onSubmit(payload);
      if (!initialData && saved) {
        // Stay on the page to show the one-time setup link the School Admin hands over.
        setCreated({ teacher: saved, setupLink: saved.setup_link ?? null });
      }
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const serverErrors = err.response.data as Record<string, string[]>;
        for (const [field, messages] of Object.entries(serverErrors)) {
          if (field in teacherSchema.shape) {
            setError(field as keyof TeacherFormValues, { message: Array.isArray(messages) ? messages[0] : String(messages) });
          }
        }
      }
    }
  };

  const copySetupLink = async () => {
    if (!created?.setupLink) return;
    try {
      await navigator.clipboard.writeText(created.setupLink);
      setCopied(true);
      setCopyError(null);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError('Could not copy the link — select and copy it manually.');
    }
  };

  if (created) {
    return (
      <Card className="max-w-2xl bg-[#F1EFFE]">
        <CardHeader>
          <CardTitle>Teacher created</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{created.teacher.user.full_name}</span>{' '}
            was created for{' '}
            <span className="font-medium text-foreground">{created.teacher.user.email}</span>.
          </p>

          {created.teacher.teacher_id && (
            <div className="rounded-xl border border-input p-3">
              <p className="text-xs text-muted-foreground">Teacher ID</p>
              <p className="font-mono text-base font-semibold">{created.teacher.teacher_id}</p>
            </div>
          )}

          <div className="rounded-xl border-2 border-input p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Password setup link</h3>
              <p className="text-xs text-muted-foreground">
                Send this to the teacher so they can set their own password. It has also been
                emailed to them and expires in 1 hour. The teacher cannot log in until they use it.
              </p>
            </div>

            {created.setupLink ? (
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={created.setupLink}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 min-w-0 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm font-mono"
                />
                <Button type="button" variant="outline" onClick={copySetupLink} className="shrink-0">
                  {copied ? (
                    <>
                      <Check className="mr-1 h-4 w-4" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-4 w-4" /> Copy
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-destructive">
                The setup link could not be generated. Ask the teacher to use “Forgot password”
                on the login page to set their password.
              </p>
            )}
            {copyError && <p className="text-sm text-destructive">{copyError}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                // Same route — navigating wouldn't remount, so clear the form state here.
                reset();
                setCopied(false);
                setCopyError(null);
                setAssignments([]);
                setPickedClass('');
                setPickedSection('');
                setPickedSubject('');
                setAssignError(null);
                setCreated(null);
              }}
            >
              Add another
            </Button>
            <Button
              type="button"
              variant="gradient"
              onClick={() => navigate(`/school/teachers/${created.teacher.id}`)}
            >
              Go to teacher
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl bg-[#F1EFFE]">
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
              <input type="hidden" {...register('school', { setValueAs: (v: string) => (v ? Number(v) : undefined) })} />
              <CustomSelect
                options={[
                  { value: '', label: 'Select school' },
                  ...(schoolsQuery.data?.results.map((s) => ({ value: String(s.id), label: s.name })) || [])
                ]}
                value={String(watch('school') ?? '')}
                onChange={(val) => {
                  setValue('school', val ? Number(val) : undefined as unknown as number);
                }}
                containerClassName="w-full"
              />
              {errors.school && <p className="text-xs text-destructive">{errors.school.message}</p>}
            </div>
          )}

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
                Email <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Teacher ID</Label>
              {initialData ? (
                <>
                  <p className="py-2 px-3 rounded-md border border-input bg-muted/40 font-mono text-sm">
                    {initialData.teacher_id || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Auto-generated and permanent.</p>
                </>
              ) : (
                <>
                  <p className="py-2 px-3 rounded-md border border-dashed border-input bg-muted/40 text-sm text-muted-foreground">
                    Generated automatically
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Built from the School ID, e.g. KAR_TR_001.
                  </p>
                </>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="employee_id">
                Employee ID{' '}
                {initialData ? (
                  <span className="text-muted-foreground font-normal">(optional)</span>
                ) : (
                  <span className="ml-0.5 text-destructive">*</span>
                )}
              </Label>
              <Input id="employee_id" {...register('employee_id')} />
              {errors.employee_id && (
                <p className="text-xs text-destructive">{errors.employee_id.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">
                Gender{' '}
                {initialData ? (
                  <span className="text-muted-foreground font-normal">(optional)</span>
                ) : (
                  <span className="ml-0.5 text-destructive">*</span>
                )}
              </Label>
              <input type="hidden" {...register('gender')} />
              <CustomSelect
                options={[
                  { value: '', label: 'Not specified' },
                  ...GENDER_OPTIONS
                ]}
                value={watch('gender') ?? ''}
                onChange={(val) => setValue('gender', val as 'male' | 'female' | 'other' | '')}
                containerClassName="w-full"
              />
              {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qualification">
                Qualification{' '}
                {initialData ? (
                  <span className="text-muted-foreground font-normal">(optional)</span>
                ) : (
                  <span className="ml-0.5 text-destructive">*</span>
                )}
              </Label>
              <Input id="qualification" {...register('qualification')} />
              {errors.qualification && (
                <p className="text-xs text-destructive">{errors.qualification.message}</p>
              )}
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="joining_date">
                Joining Date{' '}
                {initialData ? (
                  <span className="text-muted-foreground font-normal">(optional)</span>
                ) : (
                  <span className="ml-0.5 text-destructive">*</span>
                )}
              </Label>
              <Input id="joining_date" type="date" {...register('joining_date')} className="max-w-xs" />
              {errors.joining_date && (
                <p className="text-xs text-destructive">{errors.joining_date.message}</p>
              )}
            </div>
          </div>

          {!initialData && (
            <div className="rounded-xl border-2 border-input p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Assign Class</h3>
                <p className="text-xs text-muted-foreground">
                  Assign this teacher to one or more classes. These show on their dashboard
                  and in their assigned classes.
                </p>
              </div>

              <div className="space-y-1.5 max-w-xs">
                <Label htmlFor="academic_year">
                  Academic Year <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input id="academic_year" placeholder="2025-26" {...register('academic_year')} />
                <p className="text-xs text-muted-foreground">
                  Applies to every class assigned below.
                </p>
              </div>

              {assignmentSchoolId === undefined ? (
                <p className="text-xs text-muted-foreground">Select a school first.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="assign_class">Class</Label>
                      <CustomSelect
                        options={[
                          { value: '', label: 'Select class' },
                          ...(classesQuery.data?.results.map((c) => ({ value: String(c.id), label: `Class ${c.name}` })) || [])
                        ]}
                        value={String(pickedClass)}
                        onChange={(val) => {
                          setPickedClass(val === '' ? '' : Number(val));
                          setPickedSection('');
                        }}
                        containerClassName="w-44"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="assign_section">Section</Label>
                      <CustomSelect
                        options={[
                          { value: '', label: 'All sections' },
                          ...(sectionsQuery.data?.results.map((s) => ({ value: String(s.id), label: s.name })) || [])
                        ]}
                        value={String(pickedSection)}
                        disabled={pickedClass === ''}
                        onChange={(val) => {
                          setPickedSection(val === '' ? '' : Number(val));
                        }}
                        containerClassName="w-40"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="assign_subject">Subject</Label>
                      <CustomSelect
                        options={[
                          { value: '', label: 'No subject' },
                          ...(subjectsQuery.data?.results.map((s) => ({ value: String(s.id), label: s.name })) || [])
                        ]}
                        value={String(pickedSubject)}
                        disabled={pickedClass === ''}
                        onChange={(val) => {
                          setPickedSubject(val === '' ? '' : Number(val));
                        }}
                        containerClassName="w-48"
                      />
                    </div>
                    <Button type="button" variant="outline" onClick={addAssignment}>
                      <Plus className="mr-1 h-4 w-4" /> Add
                    </Button>
                  </div>

                  {pickedClass !== '' &&
                    subjectsQuery.data?.results.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        This class has no subjects yet — add them under Academics → Subjects.
                        You can still assign the class without one.
                      </p>
                    )}

                  {assignError && <p className="text-xs text-destructive">{assignError}</p>}

                  {assignments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No classes assigned yet.</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {assignments.map((a, index) => (
                        <li
                          key={`${a.school_class}-${a.section ?? 'all'}`}
                          className="inline-flex items-center gap-2 rounded-full border border-input bg-muted/40 pl-3 pr-1 py-1 text-xs"
                        >
                          {a.label}
                          <button
                            type="button"
                            onClick={() => removeAssignment(index)}
                            aria-label={`Remove ${a.label}`}
                            className="rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}

          {initialData && <AssignClassSection teacher={initialData} />}

          {!initialData && (
            <p className="text-xs text-muted-foreground">
              A password setup link will be sent to the teacher's email.
            </p>
          )}

          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" {...register('is_active')} className="rounded border-input" />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
            <Button type="submit" variant="gradient" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : initialData ? 'Update Teacher' : 'Create Teacher'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
