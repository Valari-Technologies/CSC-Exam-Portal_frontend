import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Edit, Eye, Plus, Search, Trash2, ClipboardList, ArrowLeft } from 'lucide-react';

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
import { testsService } from '@/services/tests.service';
import type { TestListItem, TestStatus } from '@/types';
import { CustomSelect } from '@/components/ui/CustomSelect';
import testHeaderImg from '@/assets/dashboard_designs/Test/test_header.webp';

const STATUS_BADGE: Record<TestStatus, { label: string; variant: 'default' | 'success' | 'secondary' }> = {
  draft: { label: 'Draft', variant: 'default' },
  published: { label: 'Published', variant: 'success' },
  archived: { label: 'Archived', variant: 'secondary' },
};

export default function TestsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<TestStatus | ''>('');
  const [pendingDelete, setPendingDelete] = useState<TestListItem | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tests', { page, search, status: statusFilter }],
    queryFn: () =>
      testsService.list({
        page,
        search: search || undefined,
        status: statusFilter || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => testsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      setPendingDelete(null);
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1;

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
  ];

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('/reports')}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs text-xs font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all w-fit cursor-pointer animate-fade-in"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Top Header Card with test_header.webp background */}
      <div className="relative group rounded-[20px] overflow-hidden shadow-sm border border-slate-200/60 min-h-[160px] md:min-h-[180px] flex items-center bg-[#fff0f0]">
        <img
          src={testHeaderImg}
          alt="Tests Header"
          className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
        />
        {/* Overlay to ensure high contrast/readability for the text */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[0.5px]"></div>
        
        <div className="relative z-10 w-full p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] tracking-tight flex items-center gap-3 flex-wrap leading-tight drop-shadow-sm">
              <ClipboardList className="h-7 w-7 text-rose-600 animate-pulse" />
              Tests
            </h1>
            <p className="text-slate-700 text-xs sm:text-sm mt-2 leading-relaxed font-semibold drop-shadow-sm max-w-xl">
              Create and manage tests for your classes.
            </p>
          </div>
          <Button onClick={() => navigate('/tests/new')} variant="gradient" className="shrink-0 shadow-md">
            <Plus className="mr-2 h-4 w-4" /> Create Test
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-xs flex items-center gap-3 flex-wrap">
        <form onSubmit={onSearchSubmit} className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title..."
            className="pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm w-full focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </form>
        <CustomSelect
          options={statusOptions}
          value={statusFilter}
          onChange={(val) => { setStatusFilter(val as TestStatus | ''); setPage(1); }}
          containerClassName="w-48"
        />
      </div>

      <div className="border border-slate-200/60 rounded-2xl overflow-hidden shadow-xs bg-white">
        {isLoading ? (
          <div className="py-12"><Spinner label="Loading tests..." /></div>
        ) : isError ? (
          <div className="py-12 text-center text-sm text-destructive">Failed to load tests.</div>
        ) : data && data.results.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No tests found. {search || statusFilter ? 'Try clearing filters.' : 'Create your first test.'}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-16 text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">S.No</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Title</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Subject</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Class</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Duration</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Questions</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Status</TableHead>
                <TableHead className="text-right text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.results.map((t, index) => {
                const badge = STATUS_BADGE[t.status];
                return (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted-foreground tabular-nums font-semibold py-3.5">{(page - 1) * 20 + index + 1}</TableCell>
                    <TableCell className="font-bold text-slate-900 py-3.5">
                      <Link to={`/tests/${t.id}`} className="hover:underline hover:text-indigo-600">{t.title}</Link>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900 py-3.5">{t.subject_name}</TableCell>
                    <TableCell className="font-semibold text-slate-900 py-3.5">{t.class_name}</TableCell>
                    <TableCell className="font-semibold text-slate-900 py-3.5">{t.duration_minutes} min</TableCell>
                    <TableCell className="font-bold text-indigo-600 py-3.5">{t.question_count}</TableCell>
                    <TableCell className="py-3.5">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right py-3.5">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/tests/${t.id}`)} aria-label="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/tests/${t.id}/edit`)} aria-label="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setPendingDelete(t)} aria-label="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {data && data.count > 20 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {page} of {totalPages} -- {data.count} total</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!data.previous} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <Button variant="outline" size="sm" disabled={!data.next} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete test?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{pendingDelete?.title}</strong> and all its questions/assignments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
