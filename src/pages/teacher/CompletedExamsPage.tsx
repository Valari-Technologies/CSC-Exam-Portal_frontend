import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ClipboardCheck, Search } from 'lucide-react';
import completeExamHeaderImg from '@/assets/dashboard_designs/Teacher/complete exam.png';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Spinner } from '@/components/ui/Spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { classesService, sectionsService, subjectsService } from '@/services/academics.service';
import { examsService } from '@/services/exams.service';
import { classLabel } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/CustomSelect';

function formatDateTime(iso: string | null): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function CompletedExamsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const classesQuery = useQuery({
    queryKey: ['classes-dropdown'],
    queryFn: () => classesService.list({ page_size: 100, ordering: 'numeric_value' }),
  });
  const sectionsQuery = useQuery({
    queryKey: ['sections-dropdown', classFilter],
    queryFn: () => sectionsService.list({ school_class: Number(classFilter), page_size: 200 }),
    enabled: !!classFilter,
  });
  const subjectsQuery = useQuery({
    queryKey: ['subjects-dropdown', classFilter],
    queryFn: () =>
      subjectsService.list({
        page_size: 200,
        ...(classFilter ? { school_class: Number(classFilter) } : {}),
      }),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['exam-sessions', { page, search, classFilter, sectionFilter, subjectFilter, dateFrom, dateTo }],
    queryFn: () =>
      examsService.listSessions({
        page,
        // Everything submitted onwards (the evaluation pipeline), filtered
        // server-side so pagination counts stay honest. This was the default
        // when a Status filter existed; with that filter removed it is now the
        // only view, so a session still in progress never appears here.
        status_in: 'submitted,evaluated,published',
        ...(search ? { search } : {}),
        ...(classFilter ? { school_class: Number(classFilter) } : {}),
        ...(sectionFilter ? { section: Number(sectionFilter) } : {}),
        ...(subjectFilter ? { subject: Number(subjectFilter) } : {}),
        ...(dateFrom ? { date_from: dateFrom } : {}),
        ...(dateTo ? { date_to: dateTo } : {}),
        ordering: '-submitted_at',
      }),
    placeholderData: keepPreviousData,
  });

  const rows = data?.results ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1;

  const resetPage = () => setPage(1);

  const classOptions = [
    { value: '', label: 'All' },
    ...(classesQuery.data?.results.map((c) => ({ value: String(c.id), label: classLabel(c) })) || [])
  ];

  const sectionOptions = [
    { value: '', label: 'All' },
    ...(sectionsQuery.data?.results.map((s) => ({ value: String(s.id), label: s.name })) || [])
  ];

  const subjectOptions = [
    { value: '', label: 'All' },
    ...(subjectsQuery.data?.results.map((s) => ({ value: String(s.id), label: s.name })) || [])
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="relative group rounded-[20px] overflow-hidden shadow-sm border border-slate-200/60 min-h-[160px] md:min-h-[180px] flex items-center bg-[#fbfbfe]">
        <img
          src={completeExamHeaderImg}
          alt="Completed Exams Header"
          className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
        />
        {/* Overlay to ensure high contrast/readability for the text */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent z-0" />

        <div className="relative z-10 px-6 sm:px-8 py-6 max-w-2xl">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <ClipboardCheck className="h-7 w-7 text-indigo-600" />
            Completed Exams
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 leading-relaxed font-medium">
            Review submitted attempts, evaluate answers, and publish results.
          </p>
        </div>
      </div>

      {/* filters */}
      <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-xs grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
        <div className="space-y-1 col-span-2">
          <Label htmlFor="search" className="text-xs font-black text-slate-500 uppercase tracking-wider">Student</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              id="search"
              className="pl-9 py-2.5 rounded-xl border-slate-200 bg-white font-bold text-slate-800 focus:border-indigo-500 transition-all text-sm h-10"
              placeholder="Search student name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-black text-slate-555 uppercase tracking-wider">Class</Label>
          <CustomSelect
            options={classOptions}
            value={classFilter}
            onChange={(val) => { setClassFilter(val); setSectionFilter(''); resetPage(); }}
            placeholder="All"
            className="h-10"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-black text-slate-555 uppercase tracking-wider">Section</Label>
          <CustomSelect
            options={sectionOptions}
            value={sectionFilter}
            onChange={(val) => { setSectionFilter(val); resetPage(); }}
            disabled={!classFilter}
            placeholder="All"
            className="h-10"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-black text-slate-555 uppercase tracking-wider">Subject</Label>
          <CustomSelect
            options={subjectOptions}
            value={subjectFilter}
            onChange={(val) => { setSubjectFilter(val); resetPage(); }}
            placeholder="All"
            className="h-10"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="date_from" className="text-xs font-black text-slate-550 uppercase tracking-wider">From</Label>
          <Input id="date_from" type="date" className="py-2.5 rounded-xl border-slate-200 bg-white font-bold text-slate-800 focus:border-indigo-500 transition-all text-sm h-10 px-3" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); resetPage(); }} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="date_to" className="text-xs font-black text-slate-550 uppercase tracking-wider">To</Label>
          <Input id="date_to" type="date" className="py-2.5 rounded-xl border-slate-200 bg-white font-bold text-slate-800 focus:border-indigo-500 transition-all text-sm h-10 px-3" value={dateTo} onChange={(e) => { setDateTo(e.target.value); resetPage(); }} />
        </div>
      </div>

      {/* table */}
      <div className="border border-slate-200/60 rounded-2xl overflow-hidden shadow-xs bg-white">
        {isLoading ? (
          <div className="py-12"><Spinner label="Loading completed exams..." /></div>
        ) : isError ? (
          <div className="py-12 text-center text-sm text-destructive">Failed to load exams.</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No completed exams match the current filters.
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-16 text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">S.No</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Student</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Class</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Subject</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Test</TableHead>
                <TableHead className="text-right text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Score</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Submitted</TableHead>
                <TableHead className="text-right text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s, index) => {
                return (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground tabular-nums font-semibold py-3.5">{(page - 1) * 20 + index + 1}</TableCell>
                    <TableCell className="py-3.5">
                      <div className="font-bold text-slate-900">{s.student_name}</div>
                      <div className="text-xs text-muted-foreground">{s.student_email}</div>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900 py-3.5">
                      {s.class_name ? `${s.class_name}${s.section_name ? `-${s.section_name}` : ''}` : '--'}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900 py-3.5">{s.subject_name}</TableCell>
                    <TableCell className="font-semibold text-slate-900 py-3.5">{s.test_title}</TableCell>
                    <TableCell className="text-right font-bold text-indigo-600 py-3.5">
                      {s.obtained_marks !== null
                        ? `${parseFloat(s.obtained_marks).toFixed(1)} / ${parseFloat(s.total_marks ?? '0').toFixed(1)}`
                        : '--'}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-slate-900 py-3.5">{formatDateTime(s.submitted_at)}</TableCell>
                    <TableCell className="text-right py-3.5">
                      {/* The Status COLUMN is gone, but the session's status is
                          still what decides whether this opens for evaluation or
                          read-only — so the row keeps reading it. */}
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/teacher/evaluate/${s.id}`}>
                          {s.status === 'submitted' ? 'Review' : 'View'}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* pagination */}
      {data && data.count > 20 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {page} of {totalPages} — {data.count} total</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!data.previous} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={!data.next} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
