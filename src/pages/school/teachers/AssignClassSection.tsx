import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Spinner } from '@/components/ui/Spinner';
import { classesService, sectionsService, subjectsService } from '@/services/academics.service';
import { teachersService } from '@/services/teachers.service';
import type { TeacherProfileDetail } from '@/types';

/** Pull the first human-readable message out of a DRF error body. */
function firstError(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === 'string') return record.detail;
    const first = Object.values(record)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return null;
}

interface AssignClassSectionProps {
  teacher: TeacherProfileDetail;
}

/**
 * Edit-mode counterpart of the create form's queued assignment picker. Assignments on an
 * existing teacher are managed live against /teachers/assignments/ (the API rejects them on
 * the teacher PUT), so each add/remove saves immediately and the list refetches.
 */
export default function AssignClassSection({ teacher }: AssignClassSectionProps) {
  const queryClient = useQueryClient();
  const [pickedClass, setPickedClass] = useState<number | ''>('');
  const [pickedSection, setPickedSection] = useState<number | ''>('');
  const [pickedSubject, setPickedSubject] = useState<number | ''>('');
  const [academicYear, setAcademicYear] = useState('');
  const [error, setError] = useState<string | null>(null);

  const assignmentsQuery = useQuery({
    queryKey: ['teacher-assignments', teacher.id],
    queryFn: () => teachersService.listAssignments({ teacher: teacher.id, page_size: 100 }),
  });

  const classesQuery = useQuery({
    queryKey: ['classes-for-assignment', teacher.school],
    queryFn: () => classesService.list({ school: teacher.school, page_size: 100 }),
  });

  const sectionsQuery = useQuery({
    queryKey: ['sections-for-assignment', pickedClass],
    queryFn: () => sectionsService.list({ school_class: Number(pickedClass), page_size: 100 }),
    enabled: pickedClass !== '',
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects-for-assignment', pickedClass],
    queryFn: () => subjectsService.list({ school_class: Number(pickedClass), page_size: 100 }),
    enabled: pickedClass !== '',
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['teacher-assignments', teacher.id] });
    // Keep the detail card and the list's assignment count in step.
    queryClient.invalidateQueries({ queryKey: ['teacher'] });
    queryClient.invalidateQueries({ queryKey: ['teachers'] });
  };

  const addMutation = useMutation({
    mutationFn: () =>
      teachersService.createAssignment({
        teacher: teacher.id,
        school_class: Number(pickedClass),
        section: pickedSection === '' ? null : Number(pickedSection),
        subject: pickedSubject === '' ? null : Number(pickedSubject),
        academic_year: academicYear.trim(),
      }),
    onSuccess: () => {
      refresh();
      setPickedSection('');
      setPickedSubject('');
      setError(null);
    },
    onError: (err) => {
      const detail = err instanceof AxiosError ? firstError(err.response?.data) : null;
      setError(detail ?? 'Could not add the assignment.');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => teachersService.removeAssignment(id),
    onSuccess: refresh,
  });

  const onAdd = () => {
    setError(null);
    if (pickedClass === '') {
      setError('Pick a class first.');
      return;
    }
    addMutation.mutate();
  };

  const assignments = assignmentsQuery.data?.results ?? [];

  return (
    <div className="rounded-xl border-2 border-input p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Assign Class</h3>
        <p className="text-xs text-muted-foreground">
          Assign this teacher to one or more classes. Each change is saved immediately.
        </p>
      </div>

      <div className="space-y-1.5 max-w-xs">
        <Label htmlFor="assign_year">Academic Year</Label>
        <Input
          id="assign_year"
          placeholder="2025-26"
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Applied to the class added below.</p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="assign_class">Class</Label>
          <select
            id="assign_class"
            value={pickedClass}
            onChange={(e) => {
              setPickedClass(e.target.value === '' ? '' : Number(e.target.value));
              setPickedSection('');
              setPickedSubject('');
            }}
            className="py-2 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select class</option>
            {classesQuery.data?.results.map((c) => (
              <option key={c.id} value={c.id}>Class {c.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="assign_section">Section</Label>
          <select
            id="assign_section"
            value={pickedSection}
            disabled={pickedClass === ''}
            onChange={(e) => setPickedSection(e.target.value === '' ? '' : Number(e.target.value))}
            className="py-2 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          >
            <option value="">All sections</option>
            {sectionsQuery.data?.results.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="assign_subject">Subject</Label>
          <select
            id="assign_subject"
            value={pickedSubject}
            disabled={pickedClass === ''}
            onChange={(e) => setPickedSubject(e.target.value === '' ? '' : Number(e.target.value))}
            className="py-2 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          >
            <option value="">No subject</option>
            {subjectsQuery.data?.results.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <Button type="button" variant="outline" onClick={onAdd} disabled={addMutation.isPending}>
          <Plus className="mr-1 h-4 w-4" /> {addMutation.isPending ? 'Adding…' : 'Add'}
        </Button>
      </div>

      {pickedClass !== '' && subjectsQuery.data?.results.length === 0 && (
        <p className="text-xs text-muted-foreground">
          This class has no subjects yet — add them under Academics → Subjects. You can still
          assign the class without one.
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {assignmentsQuery.isLoading ? (
        <Spinner label="Loading assignments…" />
      ) : assignments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No classes assigned yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {assignments.map((a) => (
            <li
              key={a.id}
              className="inline-flex items-center gap-2 rounded-full border border-input bg-muted/40 pl-3 pr-1 py-1 text-xs"
            >
              {`Class ${a.class_name} — ${a.section_name ?? 'All sections'}`}
              {a.subject_name ? ` — ${a.subject_name}` : ''}
              {a.academic_year ? ` (${a.academic_year})` : ''}
              <button
                type="button"
                onClick={() => removeMutation.mutate(a.id)}
                disabled={removeMutation.isPending}
                aria-label={`Remove Class ${a.class_name}`}
                className="rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
