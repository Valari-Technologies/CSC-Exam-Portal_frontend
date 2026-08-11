import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { Ban, Edit, Plus, Power, Trash2, ListOrdered } from 'lucide-react';

import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { chaptersService, classesService, subjectsService } from '@/services/academics.service';
import { teachersService } from '@/services/teachers.service';
import { schoolsService } from '@/services/schools.service';
import { useAuth } from '@/hooks/useAuth';
import { classLabel } from '@/lib/utils';
import type { Chapter, ChapterWriteRequest } from '@/types';
import chaptersHeaderImg from '@/assets/dashboard_designs/Academics/chapters/chapters.webp';
import { CustomSelect } from '@/components/ui/CustomSelect';

const chapterSchema = z.object({
  subject: z.coerce.number().int().positive('Select a subject'),
  name: z.string().min(1, 'Required').max(200),
  description: z.string().optional().default(''),
  lessons: z.array(z.string()).optional().default([]),
  is_active: z.boolean(),
});

type ChapterFormValues = z.infer<typeof chapterSchema>;

export default function ChapterManagementPage() {
  const { user } = useAuth();
  const isCSCAdmin = user?.role === 'csc_admin';
  const isTeacher = user?.role === 'teacher';
  // Admins may edit/deactivate/delete any chapter in their school. Teachers may manage
  // chapters too, but only those within their assigned subjects (see canManageChapter
  // below); the API enforces the same scope with a 403 (see ChapterViewSet).
  const canManage = user?.role === 'csc_admin' || user?.role === 'school_admin';
  const [schoolFilter, setSchoolFilter] = useState<number | ''>('');
  const [classFilter, setClassFilter] = useState<number | ''>('');
  const [subjectFilter, setSubjectFilter] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Chapter | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewingLessonsChapter, setViewingLessonsChapter] = useState<Chapter | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Chapter | null>(null);
  const [pendingStatus, setPendingStatus] = useState<{ chapter: Chapter; activate: boolean } | null>(null);
  const queryClient = useQueryClient();

  const schoolsQuery = useQuery({
    queryKey: ['schools-dropdown'],
    queryFn: () => schoolsService.list({ page_size: 100 }),
    enabled: isCSCAdmin,
  });

  // CSC Admin sees every school; default to the first so data is scoped to one
  // school (avoids a cross-school list + duplicate class names in the filter).
  useEffect(() => {
    if (isCSCAdmin && schoolFilter === '' && schoolsQuery.data?.results.length) {
      setSchoolFilter(schoolsQuery.data.results[0].id);
    }
  }, [isCSCAdmin, schoolFilter, schoolsQuery.data]);

  const scopedSchool = isCSCAdmin ? (schoolFilter || undefined) : undefined;
  const queriesReady = !isCSCAdmin || schoolFilter !== '';

  const classesQuery = useQuery({
    queryKey: ['classes', { school: schoolFilter }],
    queryFn: () => classesService.list({ page_size: 100, ordering: 'numeric_value', school: scopedSchool }),
    enabled: queriesReady,
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects', 'for-chapters', { school: schoolFilter, school_class: classFilter || undefined }],
    queryFn: () => subjectsService.list({ page_size: 100, school: scopedSchool, school_class: classFilter || undefined }),
    enabled: queriesReady,
  });

  const chaptersQuery = useQuery({
    queryKey: ['chapters', { school: schoolFilter, subject: subjectFilter || undefined, search }],
    queryFn: () =>
      chaptersService.list({
        page_size: 200,
        school: scopedSchool,
        subject: subjectFilter || undefined,
        ...(search ? { search } : {}),
      }),
    enabled: queriesReady,
    placeholderData: keepPreviousData,
  });

  // All subjects for the scoped school, independent of the page's Class filter above —
  // the New Chapter dialog owns its own Class dropdown and narrows subjects locally.
  const allSubjectsQuery = useQuery({
    queryKey: ['subjects', 'chapter-dialog', { school: schoolFilter }],
    queryFn: () => subjectsService.list({ page_size: 200, school: scopedSchool }),
    enabled: queriesReady,
  });

  // The logged-in teacher's own assignments (self-scoped endpoint). Only teachers may
  // create chapters, limited to the classes and subjects assigned to them.
  const assignmentsQuery = useQuery({
    queryKey: ['my-assignments-chapters'],
    queryFn: () => teachersService.listAssignments({ page_size: 100 }),
    enabled: isTeacher,
  });

  const schoolOptions = (schoolsQuery.data?.results ?? []).map((s) => ({
    value: String(s.id),
    label: s.name,
  }));

  const classOptions = [
    { value: '', label: 'All classes' },
    ...(classesQuery.data?.results ?? []).map((c) => ({
      value: String(c.id),
      label: classLabel(c),
    })),
  ];

  const subjectOptions = [
    { value: '', label: 'All subjects' },
    ...(subjectsQuery.data?.results ?? []).map((s) => ({
      value: String(s.id),
      label: `${s.name} (${s.class_name})`,
    })),
  ];

  // Distinct classes the teacher is assigned to — the dialog's Class dropdown options.
  const assignedClasses = useMemo(() => {
    const rows = assignmentsQuery.data?.results ?? [];
    const byId = new Map<number, string>();
    for (const a of rows) byId.set(a.school_class, a.class_name);
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [assignmentsQuery.data]);

  // The subjects a teacher is assigned, as two rules combined below: a subject-bound
  // assignment grants that one subject; a whole-class assignment (no subject named) grants
  // every subject of that class. Mirrors the backend scoping in ChapterViewSet.
  const assignedSubjectScope = useMemo(() => {
    const rows = assignmentsQuery.data?.results ?? [];
    const wholeClassIds = new Set<number>();
    const namedSubjectIds = new Set<number>();
    for (const a of rows) {
      if (a.subject == null) wholeClassIds.add(a.school_class);
      else namedSubjectIds.add(a.subject);
    }
    return { wholeClassIds, namedSubjectIds };
  }, [assignmentsQuery.data]);

  // Classes offered in the New Chapter dialog: a teacher sees only their assigned classes;
  // admins see every class of the scoped school.
  const dialogClasses = useMemo(() => {
    if (isTeacher) return assignedClasses.map((c) => ({ id: c.id, label: c.name }));
    return (classesQuery.data?.results ?? []).map((c) => ({ id: c.id, label: classLabel(c) }));
  }, [isTeacher, assignedClasses, classesQuery.data]);

  // Subjects offered in the dialog: a teacher sees only their assigned subjects (union rule
  // above); admins see all. The dialog further narrows these by its own Class dropdown.
  const dialogSubjects = useMemo(() => {
    const all = allSubjectsQuery.data?.results ?? [];
    if (!isTeacher) return all;
    const { wholeClassIds, namedSubjectIds } = assignedSubjectScope;
    return all.filter((s) => namedSubjectIds.has(s.id) || wholeClassIds.has(s.school_class));
  }, [isTeacher, allSubjectsQuery.data, assignedSubjectScope]);

  // Teachers with no assignments have no class to create under, so hide the action for them.
  const canCreate = canManage || (isTeacher && assignedClasses.length > 0);

  // The subject ids a teacher is allowed to manage (dialogSubjects is already scoped to
  // the teacher's assignments upstream). A teacher's chapter list stays school-wide, so
  // per-row actions are gated to only the chapters whose subject is in this set.
  const manageableSubjectIds = useMemo(
    () => new Set(dialogSubjects.map((s) => s.id)),
    [dialogSubjects],
  );
  const canManageChapter = (ch: Chapter) =>
    canManage || (isTeacher && manageableSubjectIds.has(ch.subject));
  // Whether to render the Actions column at all (any role that can manage something).
  const showActions = canManage || isTeacher;

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: number) => chaptersService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      setPendingDelete(null);
      setDeleteError(null);
    },
    onError: (err) => {
      // Surface the backend's controlled 400 (e.g. blocked by tests/results)
      const detail =
        err instanceof AxiosError && typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : 'Delete failed. Please try again.';
      setDeleteError(detail);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, activate }: { id: number; activate: boolean }) =>
      chaptersService.patch(id, { is_active: activate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      setPendingStatus(null);
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card with chapters.webp background */}
      <div className="relative group rounded-[20px] overflow-hidden shadow-sm border border-slate-200/60 min-h-[160px] md:min-h-[180px] flex items-center bg-[#f0f9ff]">
        <img
          src={chaptersHeaderImg}
          alt="Chapters Header"
          className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
        />
        {/* Overlay to ensure high contrast/readability for the text */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[0.5px]"></div>
        
        <div className="relative z-10 w-full p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] tracking-tight flex items-center gap-3 flex-wrap leading-tight drop-shadow-sm">
              <ListOrdered className="h-7 w-7 text-sky-600 animate-pulse" />
              Chapters
            </h1>
            <p className="text-slate-700 text-xs sm:text-sm mt-2 leading-relaxed font-semibold drop-shadow-sm max-w-xl">
              Ordered list of topics within each subject.
            </p>
          </div>
          {canCreate && (
            <Button variant="gradient" onClick={() => setCreating(true)} className="shrink-0 shadow-md">
              <Plus className="h-4 w-4 mr-2" /> New Chapter
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-xs flex items-center gap-3 flex-wrap">
        {isCSCAdmin && (
          <CustomSelect
            options={schoolOptions}
            value={String(schoolFilter)}
            onChange={(val) => { setSchoolFilter(val ? Number(val) : ''); setClassFilter(''); setSubjectFilter(''); }}
            placeholder="Select School..."
            containerClassName="w-64"
          />
        )}
        <input
          type="search"
          placeholder="Search chapters..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="py-2 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-56"
        />
        <CustomSelect
          options={classOptions}
          value={String(classFilter)}
          onChange={(val) => { setClassFilter(val ? Number(val) : ''); setSubjectFilter(''); }}
          placeholder="Filter by class..."
          containerClassName="w-48"
        />
        <CustomSelect
          options={subjectOptions}
          value={String(subjectFilter)}
          onChange={(val) => setSubjectFilter(val ? Number(val) : '')}
          placeholder="Filter by subject..."
          containerClassName="w-56"
        />
      </div>

      <div className="border border-slate-200/60 rounded-2xl overflow-hidden shadow-xs bg-white">
        {chaptersQuery.isLoading ? (
          <div className="py-12"><Spinner label="Loading chapters…" /></div>
        ) : !chaptersQuery.data || chaptersQuery.data.results.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {canCreate ? 'No chapters yet. Click "New Chapter" to add one.' : 'No chapters found.'}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-16 text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">S.No</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Subject</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Chapter</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Lessons</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Status</TableHead>
                {showActions && <TableHead className="text-center text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {chaptersQuery.data.results.map((ch, index) => (
                <TableRow key={ch.id}>
                  <TableCell className="text-muted-foreground tabular-nums font-semibold py-3.5">{index + 1}</TableCell>
                  <TableCell className="font-bold text-slate-900 py-3.5">{ch.subject_name}</TableCell>
                  <TableCell className="py-3.5">
                    <button
                      type="button"
                      onClick={() => setViewingLessonsChapter(ch)}
                      className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-left outline-none cursor-pointer"
                    >
                      {ch.name}
                    </button>
                  </TableCell>
                  <TableCell className="font-bold text-slate-900 py-3.5">{ch.lessons?.length || 0}</TableCell>
                  <TableCell className="py-3.5">
                    <Badge variant={ch.is_active ? 'success' : 'secondary'}>
                      {ch.is_active ? 'active' : 'inactive'}
                    </Badge>
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-center py-3.5">
                      {canManageChapter(ch) && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => setEditing(ch)} aria-label="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          {ch.is_active ? (
                            <Button variant="ghost" size="icon" onClick={() => setPendingStatus({ chapter: ch, activate: false })} aria-label="Deactivate" title="Deactivate">
                              <Ban className="h-4 w-4 text-amber-600" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" onClick={() => setPendingStatus({ chapter: ch, activate: true })} aria-label="Activate" title="Activate">
                              <Power className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPendingDelete(ch)}
                            aria-label="Delete"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ChapterDialog
        open={creating || editing !== null}
        initial={editing}
        classes={dialogClasses}
        subjects={dialogSubjects}
        defaultSubjectId={subjectFilter || undefined}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['chapters'] })}
      />

      <Dialog open={viewingLessonsChapter !== null} onOpenChange={(o) => !o && setViewingLessonsChapter(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Lessons in {viewingLessonsChapter?.name}</DialogTitle>
            <DialogDescription>
              List of topics and lessons covered under this chapter.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {!viewingLessonsChapter?.lessons || viewingLessonsChapter.lessons.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No lessons added to this chapter yet.</p>
            ) : (
              <ul className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {viewingLessonsChapter.lessons.map((lesson, idx) => (
                  <li key={idx} className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 text-sm font-semibold text-slate-700">
                    <span className="text-indigo-500 font-mono text-xs w-4">{idx + 1}.</span>
                    <span>{lesson}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingLessonsChapter(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingStatus !== null} onOpenChange={(o) => !o && setPendingStatus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingStatus?.activate ? 'Activate chapter?' : 'Deactivate chapter?'}</DialogTitle>
            <DialogDescription>
              {pendingStatus?.activate
                ? <>This will mark <strong>{pendingStatus?.chapter.name}</strong> active.</>
                : <>This will mark <strong>{pendingStatus?.chapter.name}</strong> inactive.</>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingStatus(null)}>Cancel</Button>
            <Button
              variant={pendingStatus?.activate ? 'gradient' : 'destructive'}
              disabled={statusMutation.isPending}
              onClick={() => pendingStatus && statusMutation.mutate({ id: pendingStatus.chapter.id, activate: pendingStatus.activate })}
            >
              {statusMutation.isPending
                ? (pendingStatus?.activate ? 'Activating…' : 'Deactivating…')
                : (pendingStatus?.activate ? 'Activate' : 'Deactivate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingDelete !== null} onOpenChange={(o) => { if (!o) { setPendingDelete(null); setDeleteError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete chapter?</DialogTitle>
            <DialogDescription>
              Delete <strong>{pendingDelete?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPendingDelete(null); setDeleteError(null); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ChapterDialogProps {
  open: boolean;
  initial?: Chapter | null;
  classes: { id: number; label: string }[];
  subjects: { id: number; name: string; class_name: string; school_class: number }[];
  defaultSubjectId?: number;
  onClose: () => void;
  onSaved: () => void;
}

function ChapterDialog({ open, initial, classes, subjects, defaultSubjectId, onClose, onSaved }: ChapterDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);
  // Class is a UI-only field that narrows the Subject dropdown; only `subject` is submitted.
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [newLesson, setNewLesson] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChapterFormValues>({
    resolver: zodResolver(chapterSchema),
    defaultValues: { subject: 0, name: '', description: '', lessons: [], is_active: true },
  });

  const lessons = watch('lessons') || [];

  const handleAddLesson = () => {
    if (newLesson.trim()) {
      if (lessons.includes(newLesson.trim())) {
        return; // Avoid duplicates
      }
      setValue('lessons', [...lessons, newLesson.trim()]);
      setNewLesson('');
    }
  };

  const handleRemoveLesson = (index: number) => {
    setValue('lessons', lessons.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (!open) return;
    if (initial) {
      const subj = subjects.find((s) => s.id === initial.subject);
      setSelectedClass(subj?.school_class ?? '');
      reset({
        subject: initial.subject,
        name: initial.name,
        description: initial.description,
        lessons: initial.lessons || [],
        is_active: initial.is_active,
      });
    } else {
      const preset = defaultSubjectId ? subjects.find((s) => s.id === defaultSubjectId) : undefined;
      setSelectedClass(preset?.school_class ?? '');
      reset({
        subject: preset?.id ?? 0,
        name: '',
        description: '',
        lessons: [],
        is_active: true,
      });
    }
    setFormError(null);
    setNewLesson('');
  }, [open, initial, defaultSubjectId, subjects, reset]);

  // Subjects belonging to the class in focus (the `subjects` list is already role-scoped
  // for teachers upstream, so this only ever narrows within an allowed set).
  const subjectsForClass =
    selectedClass === '' ? [] : subjects.filter((s) => s.school_class === selectedClass);

  const submit = async (values: ChapterFormValues) => {
    setFormError(null);
    const payload: ChapterWriteRequest = {
      subject: values.subject,
      name: values.name,
      description: values.description ?? '',
      lessons: values.lessons ?? [],
      is_active: values.is_active,
    };
    try {
      if (initial) await chaptersService.update(initial.id, payload);
      else await chaptersService.create(payload);
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data && typeof err.response.data === 'object') {
        const data = err.response.data as Record<string, string | string[] | undefined>;
        let handled = false;
        (['name', 'description', 'subject', 'is_active'] as const).forEach((field) => {
          const v = data[field];
          if (v) {
            setError(field, { type: 'server', message: Array.isArray(v) ? v.join(' ') : v });
            handled = true;
          }
        });
        if (!handled) setFormError(typeof data.detail === 'string' ? data.detail : 'Save failed.');
      } else setFormError('Something went wrong.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? `Edit ${initial.name}` : 'New Chapter'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium">Class</label>
              <CustomSelect
                options={classes.map((c) => ({ value: String(c.id), label: c.label }))}
                value={selectedClass ? String(selectedClass) : ''}
                onChange={(val) => {
                  setSelectedClass(val ? Number(val) : '');
                  setValue('subject', 0);
                }}
                placeholder="Select a class…"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium">Subject</label>
              <CustomSelect
                options={subjectsForClass.map((s) => ({ value: String(s.id), label: s.name }))}
                disabled={selectedClass === ''}
                value={watch('subject') ? String(watch('subject')) : ''}
                onChange={(val) => setValue('subject', Number(val))}
                placeholder={selectedClass === '' ? 'Select a class first…' : 'Select a subject…'}
              />
              {errors.subject && <p className="text-sm text-destructive mt-1">{errors.subject.message}</p>}
            </div>
          </div>
          <AnimatedInput label="Chapter name" placeholder="Algebra Basics" error={errors.name?.message} {...register('name')} />

          <div className="space-y-2">
            <label className="block text-sm font-medium">Lessons</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Introduction to variables"
                value={newLesson}
                onChange={(e) => setNewLesson(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLesson();
                  }
                }}
                className="flex-1 px-4 py-2 text-sm rounded-xl border-2 border-input bg-background focus:border-primary outline-none"
              />
              <Button type="button" variant="outline" onClick={handleAddLesson} className="shrink-0">
                Add
              </Button>
            </div>
            {lessons.length > 0 && (
              <div className="max-h-36 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100 bg-slate-50/50 custom-scrollbar mt-2">
                {lessons.map((lesson, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700">
                    <span className="truncate">{lesson}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLesson(idx)}
                      className="text-rose-500 hover:text-rose-700 transition-colors p-1"
                      title="Remove lesson"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium">Description (optional)</label>
            <textarea
              rows={2}
              className="w-full px-4 py-3 rounded-xl border-2 border-input bg-background focus:border-primary outline-none"
              {...register('description')}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="rounded" {...register('is_active')} />
            Active
          </label>
          {formError && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
              {formError}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="gradient" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : initial ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
