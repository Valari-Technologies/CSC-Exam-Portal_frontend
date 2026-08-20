import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Ban, Edit, Eye, Plus, Power, Search, Trash2, Users } from 'lucide-react';

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
import { teachersService } from '@/services/teachers.service';
import { schoolsService } from '@/services/schools.service';
import { useAuth } from '@/hooks/useAuth';
import type { TeacherProfile } from '@/types';
import { CustomSelect } from '@/components/ui/CustomSelect';
import teacherSubHeaderImg from '@/assets/dashboard_designs/Teacher/teacher_sub_header.webp';

export default function TeachersListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [schoolFilter, setSchoolFilter] = useState<number | ''>('');
  const [pendingStatus, setPendingStatus] = useState<{ teacher: TeacherProfile; activate: boolean } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TeacherProfile | null>(null);

  const { user } = useAuth();
  const isCSCAdmin = user?.role === 'csc_admin';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const schoolsQuery = useQuery({
    queryKey: ['schools-dropdown'],
    queryFn: () => schoolsService.list({ page_size: 100 }),
    enabled: isCSCAdmin,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['teachers', { page, search, school: schoolFilter }],
    queryFn: () => teachersService.list({ page, search: search || undefined, school: schoolFilter || undefined }),
    placeholderData: keepPreviousData,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, activate }: { id: number; activate: boolean }) => {
      if (activate) await teachersService.patch(id, { is_active: true });
      else await teachersService.remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teacher'] });
      setPendingStatus(null);
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: number) => teachersService.hardDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setPendingDelete(null);
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1;

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const schoolOptions = [
    { value: '', label: 'All schools' },
    ...(schoolsQuery.data?.results.map((s) => ({ value: String(s.id), label: s.name })) || [])
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Card with teacher_sub_header.webp background */}
      <div className="relative group rounded-[20px] overflow-hidden shadow-sm border border-slate-200/60 min-h-[160px] md:min-h-[180px] flex items-center bg-[#f0f9ff]">
        <img
          src={teacherSubHeaderImg}
          alt="Teachers Header"
          className="absolute inset-0 w-full h-full object-cover object-right select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
        />
        {/* Overlay to ensure high contrast/readability for the text */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[0.5px]"></div>
        
        <div className="relative z-10 w-full p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] tracking-tight flex items-center gap-3 flex-wrap leading-tight drop-shadow-sm">
              <Users className="h-7 w-7 text-[#0284c7] animate-pulse" />
              Teachers
            </h1>
            <p className="text-slate-700 text-xs sm:text-sm mt-2 leading-relaxed font-semibold drop-shadow-sm max-w-xl">
              Manage teacher accounts and class assignments.
            </p>
          </div>
          <Button onClick={() => navigate('/school/teachers/new')} variant="gradient" className="shrink-0 shadow-md">
            <Plus className="mr-2 h-4 w-4" /> Add Teacher
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <form onSubmit={onSearchSubmit} className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email…"
            className="pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm w-full focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </form>
        {isCSCAdmin && (
          <CustomSelect
            options={schoolOptions}
            value={String(schoolFilter)}
            onChange={(val) => {
              setSchoolFilter(val ? Number(val) : '');
              setPage(1);
            }}
            containerClassName="w-64"
          />
        )}
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="py-12"><Spinner label="Loading teachers…" /></div>
        ) : isError ? (
          <div className="py-12 text-center text-sm text-destructive">Failed to load teachers.</div>
        ) : data && data.results.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No teachers found. {search ? 'Try clearing search.' : 'Add your first teacher.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">S.No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                {isCSCAdmin && <TableHead>School</TableHead>}
                <TableHead>Teacher ID</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Qualification</TableHead>
                <TableHead>Assign Class</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.results.map((t, index) => (
                <TableRow key={t.id}>
                  <TableCell className="text-muted-foreground tabular-nums">{(page - 1) * 20 + index + 1}</TableCell>
                  <TableCell className="font-medium">
                    <Link to={`/school/teachers/${t.id}`} className="hover:underline">
                      {t.user_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.user_email}</TableCell>
                  {isCSCAdmin && <TableCell className="text-sm">{t.school_name}</TableCell>}
                  <TableCell className="font-mono text-xs">{t.teacher_id || '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{t.employee_id || '—'}</TableCell>
                  <TableCell className="text-sm">{t.qualification || '—'}</TableCell>
                  <TableCell>{t.assignments_count}</TableCell>
                  <TableCell>
                    <Badge variant={t.is_active ? 'success' : 'destructive'}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/school/teachers/${t.id}`)} aria-label="View">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/school/teachers/${t.id}/edit`)} aria-label="Edit">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {t.is_active ? (
                        <Button variant="ghost" size="icon" onClick={() => setPendingStatus({ teacher: t, activate: false })} aria-label="Deactivate" title="Deactivate">
                          <Ban className="h-4 w-4 text-amber-600" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => setPendingStatus({ teacher: t, activate: true })} aria-label="Activate" title="Activate">
                          <Power className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setPendingDelete(t)} aria-label="Delete" title="Delete permanently">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
            <DialogTitle>{pendingStatus?.activate ? 'Activate teacher?' : 'Deactivate teacher?'}</DialogTitle>
            <DialogDescription>
              {pendingStatus?.activate ? (
                <>This will reactivate <strong>{pendingStatus?.teacher.user_name}</strong> and restore their access.</>
              ) : (
                <>This will deactivate <strong>{pendingStatus?.teacher.user_name}</strong>. Their account will be disabled but data preserved.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingStatus(null)}>Cancel</Button>
            <Button
              variant={pendingStatus?.activate ? 'gradient' : 'destructive'}
              disabled={statusMutation.isPending}
              onClick={() => pendingStatus && statusMutation.mutate({ id: pendingStatus.teacher.id, activate: pendingStatus.activate })}
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
            <DialogTitle>Delete teacher permanently?</DialogTitle>
            <DialogDescription>
              This <strong>permanently deletes</strong> <strong>{pendingDelete?.user_name}</strong> — their account,
              profile, and all class/subject assignments. This action cannot be undone. To keep their data,
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
