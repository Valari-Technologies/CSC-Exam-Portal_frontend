import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Plus, X } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { classesService, sectionsService } from '@/services/academics.service';
import { studentsService } from '@/services/students.service';
import { testsService } from '@/services/tests.service';
import { classLabel } from '@/lib/utils';
import type {
  AssignedToType,
  StudentProfile,
  TestAssignmentWriteRequest,
} from '@/types';

const assignSchema = z.object({
  assigned_to_type: z.enum(['class', 'section', 'students'] as const),
  // Optional at the schema level and required per-type in the refinements below:
  // a student-level assignment names its recipients directly and has no class.
  school_class: z.number().optional().nullable(),
  section: z.number().optional().nullable(),
  start_datetime: z.string().min(1, 'Start date/time is required'),
  end_datetime: z.string().min(1, 'End date/time is required'),
}).refine(
  (data) => data.assigned_to_type === 'students' || !!data.school_class,
  { message: 'Class is required', path: ['school_class'] },
).refine(
  (data) => {
    if (data.assigned_to_type === 'section' && !data.section) return false;
    return true;
  },
  { message: 'Section is required for section-level assignment', path: ['section'] },
).refine(
  (data) => {
    if (data.start_datetime && data.end_datetime) {
      return new Date(data.end_datetime) > new Date(data.start_datetime);
    }
    return true;
  },
  { message: 'End must be after start', path: ['end_datetime'] },
);

type AssignFormValues = z.infer<typeof assignSchema>;

/**
 * `datetime-local` inputs want 'YYYY-MM-DDTHH:mm' in LOCAL time — an ISO/UTC string
 * silently fails to populate the field.
 */
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** Full profile for one student, opened from "View Details". */
function StudentDetailsDialog({
  profileId,
  onClose,
}: {
  profileId: number | null;
  onClose: () => void;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['student-detail', profileId],
    queryFn: () => studentsService.get(profileId as number),
    enabled: profileId !== null,
  });

  const rows: [string, string][] = data
    ? [
        ['Student ID', data.student_id ?? '--'],
        ['Full name', data.user.full_name],
        ['Class & section', data.display_class_section],
        ['Roll number', data.roll_number],
        ['Admission number', data.admission_number || '--'],
        ['Email', data.user.email ?? '--'],
        ['Date of birth', data.date_of_birth ?? '--'],
        ['Gender', data.gender || '--'],
        ['Parent name', data.parent_name || '--'],
        ['Parent phone', data.parent_phone || '--'],
        ['School', data.school_name],
        ['School ID', data.school_code],
        ['Enrolled on', data.enrollment_date],
        ['Status', data.is_active ? 'Active' : 'Inactive'],
      ]
    : [];

  return (
    <Dialog open={profileId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Student Details</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="py-8">
            <Spinner label="Loading student..." />
          </div>
        ) : isError || !data ? (
          <p className="py-6 text-sm text-destructive">Failed to load this student.</p>
        ) : (
          <dl className="divide-y divide-border text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-2 gap-4 py-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AssignTestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const testId = Number(id);

  // Recipients for a student-level assignment. Held outside react-hook-form because
  // each entry is resolved by a server lookup, not typed straight into a field — the
  // form only ever sees the ids that a lookup actually returned.
  const [pickedStudents, setPickedStudents] = useState<StudentProfile[]>([]);
  const [studentIdInput, setStudentIdInput] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [detailProfileId, setDetailProfileId] = useState<number | null>(null);

  const { data: test, isLoading: testLoading } = useQuery({
    queryKey: ['test', id],
    queryFn: () => testsService.get(testId),
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<AssignFormValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: {
      assigned_to_type: 'class',
      school_class: undefined,
      section: null,
      // Default the window to "available now, for a week". An assignment only reaches
      // students once its start time has passed, so a blank start meant the common case —
      // assign and let them take it — required the teacher to type today's date correctly.
      // Both remain editable for a genuinely scheduled test.
      start_datetime: toLocalInputValue(new Date()),
      end_datetime: toLocalInputValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    },
  });

  const assignedToType = watch('assigned_to_type');
  const selectedClass = watch('school_class');

  // Pre-select the test's class
  useEffect(() => {
    if (test?.school_class) {
      setValue('school_class', test.school_class);
    }
  }, [test, setValue]);

  const classesQuery = useQuery({
    queryKey: ['classes-dropdown'],
    queryFn: () => classesService.list({ page_size: 100 }),
  });

  const sectionsQuery = useQuery({
    queryKey: ['sections-dropdown', selectedClass],
    queryFn: () => sectionsService.list({ school_class: selectedClass ?? undefined, page_size: 100 }),
    enabled: !!selectedClass && assignedToType === 'section',
  });

  const createMutation = useMutation({
    mutationFn: (payload: TestAssignmentWriteRequest) => testsService.createAssignment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test', id] });
      queryClient.invalidateQueries({ queryKey: ['test-assignments'] });
      navigate(`/tests/${testId}/assignments`);
    },
  });

  /**
   * Resolve one typed Student ID and add the student to the list.
   *
   * The lookup is exact, so what is added is the student whose ID was typed — never a
   * near match. Every rejection is reported against the ID that was entered, because
   * the whole point of this screen is that the teacher can tell WHICH child the paper
   * is going to before they send it.
   */
  const addStudent = async () => {
    const studentId = studentIdInput.trim();
    setLookupError(null);
    if (!studentId) return;

    if (pickedStudents.some((s) => s.student_id === studentId)) {
      setLookupError(`${studentId} has already been added.`);
      return;
    }

    setLookingUp(true);
    try {
      const found = await studentsService.list({ user__student_id: studentId });
      const student = found.results[0];

      if (!student) {
        setLookupError(`No student found with ID "${studentId}".`);
        return;
      }
      if (!student.is_active) {
        // The API rejects inactive students anyway; saying so here beats a form
        // error appearing only after the whole assignment is submitted.
        setLookupError(`${student.user_name} (${studentId}) is deactivated and cannot be assigned a test.`);
        return;
      }

      setPickedStudents((prev) => [...prev, student]);
      setStudentIdInput('');
    } catch {
      setLookupError('Could not look up that Student ID. Please try again.');
    } finally {
      setLookingUp(false);
    }
  };

  const removeStudent = (profileId: number) => {
    setPickedStudents((prev) => prev.filter((s) => s.id !== profileId));
  };

  const onSubmit = async (data: AssignFormValues) => {
    if (data.assigned_to_type === 'students' && pickedStudents.length === 0) {
      setError('root', { message: 'Add at least one student by Student ID.' });
      return;
    }
    try {
      const isStudentLevel = data.assigned_to_type === 'students';
      const payload: TestAssignmentWriteRequest = {
        test: testId,
        assigned_to_type: data.assigned_to_type as AssignedToType,
        // A student-level assignment names its recipients, so class and section are
        // left null rather than carrying the test's class along as a phantom scope —
        // the student queryset matches on the recipient rows, not on these.
        school_class: isStudentLevel ? null : data.school_class,
        section: data.assigned_to_type === 'section' ? (data.section ?? null) : null,
        // The API takes USER ids; StudentProfile.user is that id, not the profile's own.
        students: isStudentLevel ? pickedStudents.map((s) => s.user) : undefined,
        start_datetime: new Date(data.start_datetime).toISOString(),
        end_datetime: new Date(data.end_datetime).toISOString(),
      };
      await createMutation.mutateAsync(payload);
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const serverErrors = err.response.data as Record<string, string[] | string>;
        for (const [field, messages] of Object.entries(serverErrors)) {
          const msg = Array.isArray(messages) ? messages[0] : String(messages);
          if (field === 'detail' || field === 'students') {
            setError('root', { message: msg });
          } else {
            setError(field as keyof AssignFormValues, { message: msg });
          }
        }
      }
    }
  };

  if (testLoading) return <Spinner label="Loading test..." />;
  if (!test) return <p className="text-sm text-destructive">Test not found.</p>;

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Assign Test: {test.title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {test.subject_name} -- {test.class_name}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errors.root && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{errors.root.message}</p>
          )}

          <div className="space-y-1.5">
            <Label>Assign to</Label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  value="class"
                  {...register('assigned_to_type')}
                  className="border-input"
                />
                Entire Class
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  value="section"
                  {...register('assigned_to_type')}
                  className="border-input"
                />
                Specific Section
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  value="students"
                  {...register('assigned_to_type')}
                  className="border-input"
                />
                Specific Students
              </label>
            </div>
          </div>

          {assignedToType !== 'students' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="school_class">Class</Label>
                <select
                  id="school_class"
                  value={selectedClass ?? ''}
                  onChange={(e) => {
                    setValue('school_class', Number(e.target.value));
                    setValue('section', null);
                  }}
                  className="w-full py-2 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select class</option>
                  {classesQuery.data?.results.map((c) => (
                    <option key={c.id} value={c.id}>{classLabel(c)}</option>
                  ))}
                </select>
                {errors.school_class && <p className="text-xs text-destructive">{errors.school_class.message}</p>}
              </div>

              {assignedToType === 'section' && (
                <div className="space-y-1.5">
                  <Label htmlFor="section">Section</Label>
                  <select
                    id="section"
                    value={watch('section') ?? ''}
                    onChange={(e) => setValue('section', e.target.value ? Number(e.target.value) : null)}
                    className="w-full py-2 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={!selectedClass}
                  >
                    <option value="">Select section</option>
                    {sectionsQuery.data?.results.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {errors.section && <p className="text-xs text-destructive">{errors.section.message}</p>}
                </div>
              )}
            </div>
          )}

          {assignedToType === 'students' && (
            <div className="space-y-3 rounded-md border border-input p-4">
              <div className="space-y-1.5">
                <Label htmlFor="student_id_input">Student ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="student_id_input"
                    placeholder="e.g. CSC001-0002"
                    value={studentIdInput}
                    onChange={(e) => {
                      setStudentIdInput(e.target.value);
                      setLookupError(null);
                    }}
                    // Enter adds the student instead of submitting the form — typing
                    // several IDs in a row is the normal way to use this, and having
                    // the first Enter assign the test would be a nasty surprise.
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void addStudent();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={lookingUp || !studentIdInput.trim()}
                    onClick={() => void addStudent()}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    {lookingUp ? 'Looking up...' : 'Add'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add one ID at a time. The test is assigned only to the students listed below.
                </p>
                {lookupError && <p className="text-xs text-destructive">{lookupError}</p>}
              </div>

              {pickedStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No students added yet.</p>
              ) : (
                <ul className="space-y-2">
                  {pickedStudents.map((s) => {
                    // The test belongs to one class; a recipient from another class can
                    // still be assigned (the API allows any student in the school), but
                    // it is almost always a mistyped ID, so it is called out rather than
                    // silently accepted.
                    const wrongClass = !!test.school_class && s.school_class !== test.school_class;
                    return (
                      <li
                        key={s.id}
                        className="flex items-start justify-between gap-3 rounded-md border bg-muted/40 p-3"
                      >
                        <div className="min-w-0 space-y-0.5 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{s.user_name}</span>
                            <Badge variant="secondary">{s.student_id ?? '--'}</Badge>
                            {wrongClass && (
                              <Badge variant="warning">Different class</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Class {s.display_class_section} -- Roll No {s.roll_number}
                            {s.user_email ? ` -- ${s.user_email}` : ''}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDetailProfileId(s.id)}
                          >
                            View Details
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${s.user_name}`}
                            onClick={() => removeStudent(s.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start_datetime">Start Date & Time</Label>
              <Input id="start_datetime" type="datetime-local" {...register('start_datetime')} />
              {errors.start_datetime && <p className="text-xs text-destructive">{errors.start_datetime.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_datetime">End Date & Time</Label>
              <Input id="end_datetime" type="datetime-local" {...register('end_datetime')} />
              {errors.end_datetime && <p className="text-xs text-destructive">{errors.end_datetime.message}</p>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Students can start this test only between these times. The exam itself runs for
            the test's duration ({test.duration_minutes} minutes).
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
            <Button type="submit" variant="gradient" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Assigning...' : 'Assign Test'}
            </Button>
          </div>
        </form>
      </CardContent>

      <StudentDetailsDialog
        profileId={detailProfileId}
        onClose={() => setDetailProfileId(null)}
      />
    </Card>
  );
}
