import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { Ban, Edit, Plus, Power, Trash2, GraduationCap } from 'lucide-react';

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
import { classesService } from '@/services/academics.service';
import { schoolsService } from '@/services/schools.service';
import { useAuth } from '@/hooks/useAuth';
import { MAX_GRADE, MIN_GRADE, classLabel } from '@/lib/utils';
import type { Class, ClassWriteRequest } from '@/types';
import classesHeaderImg from '@/assets/dashboard_designs/Academics/classes/classes.webp';
import { CustomSelect } from '@/components/ui/CustomSelect';

const classSchema = z.object({
  numeric_value: z.coerce
    .number()
    .int()
    .min(MIN_GRADE, `Min ${MIN_GRADE}`)
    .max(MAX_GRADE, `Max ${MAX_GRADE}`),
  is_active: z.boolean(),
});

type ClassFormValues = z.infer<typeof classSchema>;

export default function ClassManagementPage() {
  const { user } = useAuth();
  const isCSCAdmin = user?.role === 'csc_admin';
  // Teachers get read-only access: all mutations are hidden here and the API
  // rejects any teacher write with 403 regardless.
  const canManage = user?.role === 'csc_admin' || user?.role === 'school_admin';
  const [editing, setEditing] = useState<Class | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Class | null>(null);
  const [pendingStatus, setPendingStatus] = useState<{ cls: Class; activate: boolean } | null>(null);
  const [schoolFilter, setSchoolFilter] = useState<number | ''>('');
  const [search, setSearch] = useState('');

  const queryClient = useQueryClient();

  // For CSC admins to list schools in a dropdown to select
  const schoolsQuery = useQuery({
    queryKey: ['schools-dropdown'],
    queryFn: () => schoolsService.list({ page_size: 100 }),
    enabled: isCSCAdmin,
  });

  const schoolOptions = (schoolsQuery.data?.results ?? []).map((s) => ({
    value: String(s.id),
    label: s.name,
  }));

  // CSC Admin can see every school's classes; default to the first school so the
  // list is scoped to one school (avoids a confusing cross-school dump).
  useEffect(() => {
    if (isCSCAdmin && schoolFilter === '' && schoolsQuery.data?.results.length) {
      setSchoolFilter(schoolsQuery.data.results[0].id);
    }
  }, [isCSCAdmin, schoolFilter, schoolsQuery.data]);

  const { data, isLoading } = useQuery({
    queryKey: ['classes', { school: schoolFilter, search }],
    queryFn: () =>
      classesService.list({
        page_size: 100,
        ordering: 'numeric_value',
        school: isCSCAdmin ? (schoolFilter || undefined) : undefined,
        ...(search ? { search } : {}),
      }),
    enabled: !isCSCAdmin || schoolFilter !== '',
    placeholderData: keepPreviousData,
  });

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: number) => classesService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
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

  const statusMutation = useMutation({
    mutationFn: ({ id, activate }: { id: number; activate: boolean }) =>
      classesService.patch(id, { is_active: activate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setPendingStatus(null);
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card with classes.webp background */}
      <div className="relative group rounded-[20px] overflow-hidden shadow-sm border border-slate-200/60 min-h-[160px] md:min-h-[180px] flex items-center bg-[#f0f4ff]">
        <img
          src={classesHeaderImg}
          alt="Classes Header"
          className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
        />
        {/* Overlay to ensure high contrast/readability for the text */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[0.5px]"></div>
        
        <div className="relative z-10 w-full p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] tracking-tight flex items-center gap-3 flex-wrap leading-tight drop-shadow-sm">
              <GraduationCap className="h-7 w-7 text-indigo-600 animate-pulse" />
              Classes
              {!canManage && (
                <Badge variant="secondary" className="bg-white/80 text-slate-600 font-semibold border-slate-200/40 text-[11px] px-2 py-0.5 backdrop-blur-sm">
                  Read Only Access
                </Badge>
              )}
            </h1>
            <p className="text-slate-700 text-xs sm:text-sm mt-2 leading-relaxed font-semibold drop-shadow-sm max-w-xl">
              {canManage
                ? 'Manage the grades / classes offered at your school.'
                : 'View the grades / classes offered at your school.'}
            </p>
          </div>
          {canManage && (
            <Button variant="gradient" onClick={() => setCreating(true)} className="shrink-0 shadow-md">
              <Plus className="h-4 w-4 mr-2" /> New Class
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-xs flex items-center gap-3 flex-wrap">
        {isCSCAdmin && (
          <CustomSelect
            options={schoolOptions}
            value={String(schoolFilter)}
            onChange={(val) => setSchoolFilter(val ? Number(val) : '')}
            placeholder="Select School..."
            containerClassName="w-64"
          />
        )}
        <input
          type="search"
          placeholder="Search classes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="py-2 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-56"
        />
      </div>

      <div className="border border-slate-200/60 rounded-2xl overflow-hidden shadow-xs bg-white">
        {isLoading ? (
          <div className="py-12"><Spinner label="Loading classes…" /></div>
        ) : !data || data.results.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {canManage ? 'No classes yet. Click "New Class" to add the first one.' : 'No classes found.'}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-16 text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">S.No</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Class</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Sections</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Subjects</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Status</TableHead>
                {canManage && <TableHead className="text-center text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.results.map((cls, index) => (
                <TableRow key={cls.id}>
                  <TableCell className="text-muted-foreground tabular-nums font-semibold py-3.5">{index + 1}</TableCell>
                  <TableCell className="font-bold text-slate-900 py-3.5">{classLabel(cls)}</TableCell>
                  <TableCell className="font-semibold text-slate-900 py-3.5">{cls.sections_count}</TableCell>
                  <TableCell className="font-bold text-indigo-600 py-3.5">{cls.subjects_count}</TableCell>
                  <TableCell className="py-3.5">
                    <Badge variant={cls.is_active ? 'success' : 'secondary'}>
                      {cls.is_active ? 'active' : 'inactive'}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-center py-3.5">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(cls)} aria-label="Edit">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {cls.is_active ? (
                        <Button variant="ghost" size="icon" onClick={() => setPendingStatus({ cls, activate: false })} aria-label="Deactivate" title="Deactivate">
                          <Ban className="h-4 w-4 text-amber-600" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => setPendingStatus({ cls, activate: true })} aria-label="Activate" title="Activate">
                          <Power className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPendingDelete(cls)}
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

      <ClassDialog
        open={creating}
        schoolId={isCSCAdmin ? (schoolFilter || undefined) : undefined}
        onClose={() => setCreating(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['classes'] })}
      />
      <ClassDialog
        open={editing !== null}
        initial={editing}
        schoolId={isCSCAdmin ? (schoolFilter || undefined) : undefined}
        onClose={() => setEditing(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['classes'] })}
      />

      <Dialog open={pendingStatus !== null} onOpenChange={(o) => !o && setPendingStatus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingStatus?.activate ? 'Activate class?' : 'Deactivate class?'}</DialogTitle>
            <DialogDescription>
              {pendingStatus?.activate
                ? <>This will mark <strong>{pendingStatus?.cls.name}</strong> active.</>
                : <>This will mark <strong>{pendingStatus?.cls.name}</strong> inactive.</>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingStatus(null)}>Cancel</Button>
            <Button
              variant={pendingStatus?.activate ? 'gradient' : 'destructive'}
              disabled={statusMutation.isPending}
              onClick={() => pendingStatus && statusMutation.mutate({ id: pendingStatus.cls.id, activate: pendingStatus.activate })}
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
            <DialogTitle>Delete class?</DialogTitle>
            <DialogDescription>
              Delete <strong>{pendingDelete?.name}</strong>? This cascades to its sections, subjects,
              chapters, and student assignments.
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

interface ClassDialogProps {
  open: boolean;
  initial?: Class | null;
  schoolId?: number;
  onClose: () => void;
  onSaved: () => void;
}

function ClassDialog({ open, initial, schoolId, onClose, onSaved }: ClassDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: { numeric_value: 1, is_active: true },
  });

  useEffect(() => {
    if (open) {
      reset(
        initial
          ? { numeric_value: initial.numeric_value, is_active: initial.is_active }
          : { numeric_value: 1, is_active: true },
      );
      setFormError(null);
    }
  }, [open, initial, reset]);

  const submit = async (values: ClassFormValues) => {
    setFormError(null);
    // CSC Admin must pass `school` on create (the backend requires it for them);
    // it is read-only on update, so spreading it is harmless there.
    const payload: ClassWriteRequest = schoolId ? { ...values, school: schoolId } : values;
    try {
      if (initial) {
        await classesService.update(initial.id, payload);
      } else {
        await classesService.create(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data && typeof err.response.data === 'object') {
        const data = err.response.data as Record<string, string | string[] | undefined>;
        let handled = false;
        (['numeric_value', 'is_active'] as const).forEach((field) => {
          const value = data[field];
          if (value) {
            setError(field, { type: 'server', message: Array.isArray(value) ? value.join(' ') : value });
            handled = true;
          }
        });
        if (!handled) setFormError(typeof data.detail === 'string' ? data.detail : 'Save failed.');
      } else {
        setFormError('Something went wrong.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? `Edit ${initial.name}` : 'New Class'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          <AnimatedInput
            label={`Grade number (${MIN_GRADE}-${MAX_GRADE})`}
            type="number"
            min={MIN_GRADE}
            max={MAX_GRADE}
            error={errors.numeric_value?.message}
            {...register('numeric_value')}
          />
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
