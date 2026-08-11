import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { Ban, Edit, Plus, Power, Trash2, Layers } from 'lucide-react';

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
import { classesService, sectionsService } from '@/services/academics.service';
import { schoolsService } from '@/services/schools.service';
import { useAuth } from '@/hooks/useAuth';
import { classLabel } from '@/lib/utils';
import { SECTION_NAMES, isStandardSection } from '@/lib/sections';
import type { Class, Section, SectionWriteRequest } from '@/types';
import sectionHeaderImg from '@/assets/dashboard_designs/Academics/section/section.webp';
import { CustomSelect } from '@/components/ui/CustomSelect';

const sectionSchema = z.object({
  school_class: z.coerce.number().int().positive('Select a class'),
  name: z.string().min(1, 'Required').max(10, 'Max 10 chars'),
  is_active: z.boolean(),
});

type SectionFormValues = z.infer<typeof sectionSchema>;

export default function SectionManagementPage() {
  const { user } = useAuth();
  const isCSCAdmin = user?.role === 'csc_admin';
  // Teachers get read-only access (API also rejects teacher writes with 403).
  const canManage = user?.role === 'csc_admin' || user?.role === 'school_admin';
  const [schoolFilter, setSchoolFilter] = useState<number | ''>('');
  const [classFilter, setClassFilter] = useState<number | ''>('');
  const [editing, setEditing] = useState<Section | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<{ section: Section; activate: boolean } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Section | null>(null);
  const queryClient = useQueryClient();

  const schoolsQuery = useQuery({
    queryKey: ['schools-dropdown'],
    queryFn: () => schoolsService.list({ page_size: 100 }),
    enabled: isCSCAdmin,
  });

  // CSC Admin can see every school; default to the first so the view is scoped
  // to one school (otherwise classes/sections from all schools look duplicated).
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

  const sectionsQuery = useQuery({
    queryKey: ['sections', { school: schoolFilter, school_class: classFilter || undefined }],
    queryFn: () =>
      sectionsService.list({
        page_size: 200,
        school: scopedSchool,
        school_class: classFilter || undefined,
      }),
    enabled: queriesReady,
    placeholderData: keepPreviousData,
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

  const statusMutation = useMutation({
    mutationFn: ({ id, activate }: { id: number; activate: boolean }) =>
      sectionsService.patch(id, { is_active: activate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      setPendingStatus(null);
    },
  });

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: number) => sectionsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      setPendingDelete(null);
      setDeleteError(null);
    },
    onError: (err) => {
      // Surface the backend's controlled 400 (e.g. blocked by enrolled students)
      const detail =
        err instanceof AxiosError && typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : 'Delete failed. Please try again.';
      setDeleteError(detail);
    },
  });

  const classMap = useMemo(() => {
    const map = new Map<number, string>();
    classesQuery.data?.results.forEach((c) => map.set(c.id, classLabel(c)));
    return map;
  }, [classesQuery.data]);

  return (
    <div className="space-y-6">
      {/* Top Header Card with section.webp background */}
      <div className="relative group rounded-[20px] overflow-hidden shadow-sm border border-slate-200/60 min-h-[160px] md:min-h-[180px] flex items-center bg-[#f0f5ff]">
        <img
          src={sectionHeaderImg}
          alt="Sections Header"
          className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
        />
        {/* Overlay to ensure high contrast/readability for the text */}
        <div className="absolute inset-0 bg-white/25 backdrop-blur-[0.5px]"></div>
        
        <div className="relative z-10 w-full p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] tracking-tight flex items-center gap-3 flex-wrap leading-tight drop-shadow-sm">
              <Layers className="h-7 w-7 text-emerald-600 animate-pulse" />
              Sections
              {!canManage && (
                <Badge variant="secondary" className="bg-white/80 text-slate-600 font-semibold border-slate-200/40 text-[11px] px-2 py-0.5 backdrop-blur-sm">
                  Read Only Access
                </Badge>
              )}
            </h1>
            <p className="text-slate-700 text-xs sm:text-sm mt-2 leading-relaxed font-semibold drop-shadow-sm max-w-xl">
              Sub-divisions within each class (e.g. A, B, C).
            </p>
          </div>
          {canManage && (
            <Button variant="gradient" onClick={() => setCreating(true)} className="shrink-0 shadow-md">
              <Plus className="h-4 w-4 mr-2" /> New Section
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-xs flex items-center gap-3 flex-wrap">
        {isCSCAdmin && (
          <CustomSelect
            options={schoolOptions}
            value={String(schoolFilter)}
            onChange={(val) => { setSchoolFilter(val ? Number(val) : ''); setClassFilter(''); }}
            placeholder="Select School..."
            containerClassName="w-64"
          />
        )}
        <CustomSelect
          options={classOptions}
          value={String(classFilter)}
          onChange={(val) => setClassFilter(val ? Number(val) : '')}
          placeholder="Filter by class..."
          containerClassName="w-48"
        />
      </div>

      <div className="border border-slate-200/60 rounded-2xl overflow-hidden shadow-xs bg-white">
        {sectionsQuery.isLoading ? (
          <div className="py-12"><Spinner label="Loading sections…" /></div>
        ) : !sectionsQuery.data || sectionsQuery.data.results.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {canManage ? 'No sections yet. Click "New Section" to add one.' : 'No sections found.'}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-16 text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">S.No</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Class</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Section</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Students</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Status</TableHead>
                {canManage && <TableHead className="text-center text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectionsQuery.data.results.map((s, index) => (
                <TableRow key={s.id}>
                  <TableCell className="text-muted-foreground tabular-nums font-semibold py-3.5">{index + 1}</TableCell>
                  <TableCell className="font-bold text-slate-900 py-3.5">{s.class_name}</TableCell>
                  <TableCell className="font-bold text-emerald-600 py-3.5">{s.name}</TableCell>
                  <TableCell className="font-semibold text-slate-900 py-3.5">{s.student_count}</TableCell>
                  <TableCell className="py-3.5">
                    <Badge variant={s.is_active ? 'success' : 'secondary'}>
                      {s.is_active ? 'active' : 'inactive'}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-center py-3.5">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(s)} aria-label="Edit">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {s.is_active ? (
                        <Button variant="ghost" size="icon" onClick={() => setPendingStatus({ section: s, activate: false })} aria-label="Deactivate" title="Deactivate">
                          <Ban className="h-4 w-4 text-amber-600" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => setPendingStatus({ section: s, activate: true })} aria-label="Activate" title="Activate">
                          <Power className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPendingDelete(s)}
                        aria-label="Delete"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <SectionDialog
        open={creating || editing !== null}
        initial={editing}
        classes={classesQuery.data?.results ?? []}
        defaultClassId={classFilter || undefined}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['sections'] })}
      />

      <Dialog open={pendingStatus !== null} onOpenChange={(o) => !o && setPendingStatus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingStatus?.activate ? 'Activate section?' : 'Deactivate section?'}</DialogTitle>
            <DialogDescription>
              {pendingStatus?.activate
                ? <>This will mark section <strong>{pendingStatus?.section.name}</strong> active.</>
                : <>This will mark section <strong>{pendingStatus?.section.name}</strong> inactive.</>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingStatus(null)}>Cancel</Button>
            <Button
              variant={pendingStatus?.activate ? 'gradient' : 'destructive'}
              disabled={statusMutation.isPending}
              onClick={() => pendingStatus && statusMutation.mutate({ id: pendingStatus.section.id, activate: pendingStatus.activate })}
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
            <DialogTitle>Delete section?</DialogTitle>
            <DialogDescription>
              Delete section <strong>{pendingDelete?.name}</strong> of{' '}
              {pendingDelete && classMap.get(pendingDelete.school_class)}?
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

interface SectionDialogProps {
  open: boolean;
  initial?: Section | null;
  classes: Class[];
  defaultClassId?: number;
  onClose: () => void;
  onSaved: () => void;
}

function SectionDialog({ open, initial, classes, defaultClassId, onClose, onSaved }: SectionDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);

  // Offer A–F; if editing a section whose name is outside that set (e.g. legacy
  // "A(a)"), keep it as an option so saving doesn't silently change it.
  const nameOptions: string[] = initial && !isStandardSection(initial.name)
    ? [initial.name, ...SECTION_NAMES]
    : [...SECTION_NAMES];

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SectionFormValues>({
    resolver: zodResolver(sectionSchema),
    defaultValues: { school_class: defaultClassId ?? 0, name: '', is_active: true },
  });

  useEffect(() => {
    if (open) {
      reset(
        initial
          ? { school_class: initial.school_class, name: initial.name, is_active: initial.is_active }
          : { school_class: defaultClassId ?? (classes[0]?.id ?? 0), name: '', is_active: true },
      );
      setFormError(null);
    }
  }, [open, initial, defaultClassId, classes, reset]);

  const submit = async (values: SectionFormValues) => {
    setFormError(null);
    const payload: SectionWriteRequest = values;
    try {
      if (initial) await sectionsService.update(initial.id, payload);
      else await sectionsService.create(payload);
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data && typeof err.response.data === 'object') {
        const data = err.response.data as Record<string, string | string[] | undefined>;
        let handled = false;
        (['name', 'school_class', 'is_active'] as const).forEach((field) => {
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? `Edit section ${initial.name}` : 'New Section'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          <div className="space-y-1">
            <label className="block text-sm font-medium">Class</label>
            <select
              className="w-full px-4 py-3 rounded-xl border-2 border-input bg-background focus:border-primary outline-none"
              {...register('school_class')}
            >
              <option value={0} disabled>Select a class…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
            </select>
            {errors.school_class && <p className="text-sm text-destructive">{errors.school_class.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium">Section name</label>
            <select
              className="w-full px-4 py-3 rounded-xl border-2 border-input bg-background focus:border-primary outline-none"
              {...register('name')}
            >
              <option value="" disabled>Select a section…</option>
              {nameOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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
