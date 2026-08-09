import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Edit, Eye, Plus, Search, Trash2, School } from 'lucide-react';

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
import { schoolsService } from '@/services/schools.service';
import type { SchoolListItem, SchoolStatus } from '@/types';
import { CustomSelect } from '@/components/ui/CustomSelect';
import schoolSubHeaderImg from '@/assets/dashboard_designs/School/school_sub_header.webp';

const STATUS_VARIANT: Record<SchoolStatus, 'success' | 'warning' | 'destructive'> = {
  active: 'success',
  inactive: 'warning',
  suspended: 'destructive',
};

export default function SchoolsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | SchoolStatus>('');
  const [pendingDelete, setPendingDelete] = useState<SchoolListItem | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['schools', { page, search, status: statusFilter }],
    queryFn: () =>
      schoolsService.list({
        page,
        search: search || undefined,
        status: statusFilter || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => schoolsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      setPendingDelete(null);
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1;

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'suspended', label: 'Suspended' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Card with school_sub_header.webp background */}
      <div className="relative group rounded-[20px] overflow-hidden shadow-sm border border-slate-200/60 min-h-[160px] md:min-h-[180px] flex items-center bg-[#f0f4ff]">
        <img
          src={schoolSubHeaderImg}
          alt="Schools Header"
          className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
        />
        {/* Overlay to ensure high contrast/readability for the text */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[0.5px]"></div>
        
        <div className="relative z-10 w-full p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] tracking-tight flex items-center gap-3 flex-wrap leading-tight drop-shadow-sm">
              <School className="h-7 w-7 text-indigo-600 animate-pulse" />
              Schools
            </h1>
            <p className="text-slate-700 text-xs sm:text-sm mt-2 leading-relaxed font-semibold drop-shadow-sm max-w-xl">
              All CSC-affiliated schools on the platform.
            </p>
          </div>
          <Button onClick={() => navigate('/admin/schools/new')} variant="gradient" className="shrink-0 shadow-md">
            <Plus className="mr-2 h-4 w-4" /> New School
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <form onSubmit={onSearchSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, School ID, city…"
            className="pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm w-72 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </form>
        <CustomSelect
          options={statusOptions}
          value={statusFilter}
          onChange={(val) => {
            setStatusFilter(val as '' | SchoolStatus);
            setPage(1);
          }}
          containerClassName="w-48"
        />
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="py-12">
            <Spinner label="Loading schools…" />
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-sm text-destructive">
            Failed to load schools. {error instanceof Error ? error.message : ''}
          </div>
        ) : data && data.results.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No schools found. {search || statusFilter ? 'Try clearing filters.' : ''}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">S.No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>School ID</TableHead>
                <TableHead>School Code</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.results.map((school, index) => (
                <TableRow key={school.id}>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {(page - 1) * 20 + index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link to={`/admin/schools/${school.id}`} className="hover:underline">
                      {school.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{school.code}</TableCell>
                  <TableCell className="font-mono text-xs">{school.school_code || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {school.city}, {school.state}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {school.official_email}
                  </TableCell>
                  <TableCell>{school.user_count}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[school.status]}>{school.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/admin/schools/${school.id}`)}
                        aria-label="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/admin/schools/${school.id}/edit`)}
                        aria-label="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPendingDelete(school)}
                        aria-label="Delete"
                      >
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
          <span className="text-muted-foreground">
            Showing page {page} of {totalPages} — {data.count} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!data.previous}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data.next}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
            // Clear a previous failure so reopening the dialog starts clean.
            deleteMutation.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete school?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{pendingDelete?.name}</strong> and cascade-delete
              all its users, classes, students, and tests. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.isError && (
            <p className="text-sm text-destructive">
              Could not delete this school. Please try again or contact support.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
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
