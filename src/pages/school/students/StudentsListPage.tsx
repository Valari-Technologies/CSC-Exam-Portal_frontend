import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Ban, Edit, Eye, FileUp, Plus, Power, Search, Trash2, Users } from 'lucide-react';

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
import { studentsService } from '@/services/students.service';
import { classesService } from '@/services/academics.service';
import { schoolsService } from '@/services/schools.service';
import { teachersService } from '@/services/teachers.service';
import { useAuth } from '@/hooks/useAuth';
import { classLabel } from '@/lib/utils';
import { SECTION_NAMES } from '@/lib/sections';
import type { StudentProfile } from '@/types';
import { CustomSelect } from '@/components/ui/CustomSelect';
import studentSubHeaderImg from '@/assets/dashboard_designs/Student/student_sub_header.webp';

export default function StudentsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [classFilter, setClassFilter] = useState<number | ''>('');
  // The section LETTER, not a section id. Sections are per-class rows, so an id would only
  // be selectable after a class was chosen; the letter stands alone ("every Section B
  // of any class"). Filter-down section is therefore a textual search filter matching s.name.
  const [sectionFilter, setSectionFilter] = useState('');
  const [schoolFilter, setSchoolFilter] = useState<number | ''>('');
  const [pendingStatus, setPendingStatus] = useState<{ student: StudentProfile; activate: boolean } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StudentProfile | null>(null);

  const { user } = useAuth();
  const isCSCAdmin = user?.role === 'csc_admin';
  const isTeacher = user?.role === 'teacher';
  const isSchoolAdmin = user?.role === 'school_admin';
  const canManageStudents = isSchoolAdmin || isCSCAdmin;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const canEditStudent = () => canManageStudents || isTeacher;

  const schoolsQuery = useQuery({
    queryKey: ['schools-dropdown'],
    queryFn: () => schoolsService.list({ page_size: 100 }),
    enabled: isCSCAdmin,
  });

  const classesQuery = useQuery({
    queryKey: ['classes-dropdown'],
    queryFn: () => classesService.list({ page_size: 100 }),
    enabled: !isTeacher,
  });

  const myAssignmentsQuery = useQuery({
    queryKey: ['my-assignment-options'],
    queryFn: () => teachersService.myAssignments(),
    enabled: isTeacher,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['students', { page, search, school: schoolFilter, school_class: classFilter, section: sectionFilter }],
    queryFn: () =>
      studentsService.list({
        page,
        search: search || undefined,
        school: schoolFilter ? Number(schoolFilter) : undefined,
        school_class: classFilter ? Number(classFilter) : undefined,
        section__name: sectionFilter || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, activate }: { id: number; activate: boolean }) => {
      if (activate) await studentsService.patch(id, { is_active: true });
      else await studentsService.remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student'] });
      setPendingStatus(null);
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: number) => studentsService.hardDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setPendingDelete(null);
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1;

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  // Derive class filters
  const classOptions = isTeacher
    ? (myAssignmentsQuery.data?.classes ?? []).map((c) => ({ id: c.id, label: `Class ${c.name}` }))
    : (classesQuery.data?.results ?? []).map((c) => ({ id: c.id, label: classLabel(c) }));

  // Derive section filters:
  // 1. Teachers: only show section letters present in their assignments
  // 2. Others: show full A-F list
  const sectionOptions = isTeacher ? (myAssignmentsQuery.data?.sections ?? []) : SECTION_NAMES;

  const schoolSelectOptions = [
    { value: '', label: 'All schools' },
    ...(schoolsQuery.data?.results.map((s) => ({ value: String(s.id), label: s.name })) || [])
  ];

  const classSelectOptions = [
    { value: '', label: 'All classes' },
    ...(classOptions.map((c) => ({ value: String(c.id), label: c.label })))
  ];

  const sectionSelectOptions = [
    { value: '', label: 'All sections' },
    ...(sectionOptions.map((name) => ({ value: name, label: name })))
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Card with student_sub_header.webp background */}
      <div className="relative group rounded-[20px] overflow-hidden shadow-sm border border-slate-200/60 min-h-[160px] md:min-h-[180px] flex items-center bg-[#f0f7ff]">
        <img
          src={studentSubHeaderImg}
          alt="Students Header"
          className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
        />
        {/* Overlay to ensure high contrast/readability for the text */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[0.5px]"></div>
        
        <div className="relative z-10 w-full p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] tracking-tight flex items-center gap-3 flex-wrap leading-tight drop-shadow-sm">
              <Users className="h-7 w-7 text-indigo-600 animate-pulse" />
              Students
            </h1>
            <p className="text-slate-700 text-xs sm:text-sm mt-2 leading-relaxed font-semibold drop-shadow-sm max-w-xl">
              Manage student accounts.
            </p>
          </div>
          {canManageStudents && (
            <div className="flex gap-2 shrink-0 flex-wrap z-10">
              <Button variant="outline" onClick={() => navigate('/school/students/bulk-import')} className="bg-white/80 backdrop-blur-xs border-slate-300 hover:bg-white">
                <FileUp className="mr-2 h-4 w-4" /> Bulk Import
              </Button>
              <Button onClick={() => navigate('/school/students/new')} variant="gradient" className="shadow-md">
                <Plus className="mr-2 h-4 w-4" /> Add Student
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-xs flex items-center gap-3 flex-wrap">
        <form onSubmit={onSearchSubmit} className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, roll…"
            className="pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm w-full focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </form>
        {isCSCAdmin && (
          <CustomSelect
            options={schoolSelectOptions}
            value={String(schoolFilter)}
            onChange={(val) => {
              setSchoolFilter(val ? Number(val) : '');
              setPage(1);
            }}
            containerClassName="w-48"
          />
        )}
        <CustomSelect
          options={classSelectOptions}
          value={String(classFilter)}
          onChange={(val) => {
            setClassFilter(val ? Number(val) : '');
            setPage(1);
          }}
          containerClassName="w-48"
        />
        <CustomSelect
          options={sectionSelectOptions}
          value={sectionFilter}
          onChange={(val) => {
            setSectionFilter(val);
            setPage(1);
          }}
          containerClassName="w-44"
        />
      </div>

      <div className="border border-slate-200/60 rounded-2xl overflow-hidden shadow-xs bg-white">
        {isLoading ? (
          <div className="py-12"><Spinner label="Loading students…" /></div>
        ) : isError ? (
          <div className="py-12 text-center text-sm text-destructive">Failed to load students.</div>
        ) : data && data.results.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No students found.{' '}
            {search || classFilter || sectionFilter || schoolFilter
              ? 'Try clearing filters.'
              : isTeacher
                ? 'Students appear here once your School Admin assigns you a class and section.'
                : 'Add your first student.'}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-16 text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">S.No</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Name</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Email</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Class</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Section</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Roll No</TableHead>
                {isCSCAdmin && <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">School</TableHead>}
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Status</TableHead>
                <TableHead className="text-right text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.results.map((s, index) => (
                <TableRow key={s.id}>
                  <TableCell className="text-muted-foreground tabular-nums font-semibold py-3.5">{(page - 1) * 20 + index + 1}</TableCell>
                  <TableCell className="py-3.5">
                    <Link to={`/school/students/${s.id}`} className="font-bold text-slate-900 hover:underline hover:text-indigo-600">{s.user_name}</Link>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 font-medium py-3.5">{s.user_email || '—'}</TableCell>
                  <TableCell className="font-bold text-slate-900 py-3.5">{s.class_name}</TableCell>
                  <TableCell className="font-bold text-indigo-600 py-3.5">{s.display_section || '—'}</TableCell>
                  <TableCell className="font-mono text-xs font-semibold py-3.5">{s.roll_number || '—'}</TableCell>
                  {isCSCAdmin && <TableCell className="text-xs font-medium py-3.5">{s.school_name}</TableCell>}
                  <TableCell className="py-3.5">
                    <Badge variant={s.is_active ? 'success' : 'destructive'}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-3.5">
                    <div className="inline-flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/school/students/${s.id}`)} aria-label="View">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEditStudent() && (
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/school/students/${s.id}/edit`)} aria-label="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {/* Status and delete stay admin-only — teachers may edit a
                          student's details, not remove them from the school. */}
                      {canManageStudents && (
                        <>
                          {s.is_active ? (
                            <Button variant="ghost" size="icon" onClick={() => setPendingStatus({ student: s, activate: false })} aria-label="Deactivate" title="Deactivate">
                              <Ban className="h-4 w-4 text-amber-600" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" onClick={() => setPendingStatus({ student: s, activate: true })} aria-label="Activate" title="Activate">
                              <Power className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => setPendingDelete(s)} aria-label="Delete" title="Delete permanently">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {data && data.count > 20 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {page} of {totalPages} — {data.count} total</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!data.previous} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <Button variant="outline" size="sm" disabled={!data.next} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Dialog open={pendingStatus !== null} onOpenChange={(open) => !open && setPendingStatus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingStatus?.activate ? 'Activate student?' : 'Deactivate student?'}</DialogTitle>
            <DialogDescription>
              {pendingStatus?.activate ? (
                <>This will reactivate <strong>{pendingStatus?.student.user_name}</strong> and restore their access.</>
              ) : (
                <>This will deactivate <strong>{pendingStatus?.student.user_name}</strong>. Their data will be preserved.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingStatus(null)}>Cancel</Button>
            <Button
              variant={pendingStatus?.activate ? 'gradient' : 'destructive'}
              disabled={statusMutation.isPending}
              onClick={() => pendingStatus && statusMutation.mutate({ id: pendingStatus.student.id, activate: pendingStatus.activate })}
            >
              {statusMutation.isPending
                ? (pendingStatus?.activate ? 'Activating…' : 'Deactivating…')
                : (pendingStatus?.activate ? 'Activate' : 'Deactivate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete student permanently?</DialogTitle>
            <DialogDescription>
              This <strong>permanently deletes</strong> <strong>{pendingDelete?.user_name}</strong> — their account,
              profile, and all related records. This action cannot be undone. To keep their data,
              use <strong>Deactivate</strong> instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={hardDeleteMutation.isPending}
              onClick={() => pendingDelete && hardDeleteMutation.mutate(pendingDelete.id)}
            >
              {hardDeleteMutation.isPending ? 'Deleting…' : 'Delete permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
