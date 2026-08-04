import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Award, Download, FileSpreadsheet, FileText, Search } from 'lucide-react';
import publishedResultsHeaderImg from '@/assets/dashboard_designs/Teacher/Published Results.webp';

import { Badge } from '@/components/ui/Badge';
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
import { resultsService, type ExportFormat, type ResultListParams } from '@/services/results.service';
import { classLabel } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/CustomSelect';

function formatDate(iso: string | null): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function PublishedResultsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchType, setSearchType] = useState('student_name');
  const [showDropdown, setShowDropdown] = useState(false);
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);

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

  const queryParams: ResultListParams = {
    page,
    ordering: '-published_at',
    ...(search ? { search, search_type: searchType } : {}),
    ...(classFilter ? { school_class: Number(classFilter) } : {}),
    ...(sectionFilter ? { section: Number(sectionFilter) } : {}),
    ...(subjectFilter ? { subject: Number(subjectFilter) } : {}),
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(dateTo ? { date_to: dateTo } : {}),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['published-results', queryParams],
    queryFn: () => resultsService.list(queryParams),
    placeholderData: keepPreviousData,
  });

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

  const handleExport = async (fmt: ExportFormat) => {
    setExporting(true);
    try {
      await resultsService.export(fmt, queryParams);
    } catch {
      // surface failure inline; the list itself is unaffected
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="relative group rounded-[20px] overflow-hidden shadow-sm border border-slate-200/60 min-h-[160px] md:min-h-[180px] flex items-center bg-[#fbfbfe]">
        <img
          src={publishedResultsHeaderImg}
          alt="Published Results Header"
          className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
        />
        {/* Overlay to ensure high contrast/readability for the text */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent z-0" />

        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between w-full gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <Award className="h-7 w-7 text-indigo-600" />
              Published Results
            </h1>
            <p className="text-slate-500 text-sm mt-1.5 leading-relaxed font-medium">
              View student scorecards, performance summaries, and export results.
            </p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            <Button variant="outline" size="sm" disabled={exporting} onClick={() => handleExport('csv')}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" disabled={exporting} onClick={() => handleExport('excel')}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
            <Button variant="outline" size="sm" disabled={exporting} onClick={() => handleExport('pdf')}>
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* filters */}
      <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-xs grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
        <div className="space-y-1 col-span-2 relative">
          <Label htmlFor="search" className="text-xs font-black text-slate-550 uppercase tracking-wider">
            Search By {searchType === 'student_name' ? 'Student Name' : searchType === 'chapter_name' ? 'Chapter Name' : 'Student ID'}
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              id="search"
              className="pl-9 py-2.5 rounded-xl border-slate-200 bg-white font-bold text-slate-800 focus:border-indigo-500 transition-all text-sm h-10 w-full"
              placeholder={
                searchType === 'student_name' ? 'Search student name...' :
                searchType === 'chapter_name' ? 'Search chapter name...' :
                'Search student ID...'
              }
              value={search}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            />
            {showDropdown && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                <button
                  type="button"
                  onMouseDown={() => {
                    setSearchType('student_name');
                    setShowDropdown(false);
                    resetPage();
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 font-bold ${
                    searchType === 'student_name' ? 'text-indigo-600 bg-slate-50/50' : 'text-slate-700'
                  }`}
                >
                  Student Name
                </button>
                <button
                  type="button"
                  onMouseDown={() => {
                    setSearchType('chapter_name');
                    setShowDropdown(false);
                    resetPage();
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 font-bold ${
                    searchType === 'chapter_name' ? 'text-indigo-600 bg-slate-50/50' : 'text-slate-700'
                  }`}
                >
                  Chapter Name
                </button>
                <button
                  type="button"
                  onMouseDown={() => {
                    setSearchType('student_id');
                    setShowDropdown(false);
                    resetPage();
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 font-bold ${
                    searchType === 'student_id' ? 'text-indigo-600 bg-slate-50/50' : 'text-slate-700'
                  }`}
                >
                  Student ID
                </button>
              </div>
            )}
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
          <div className="py-12"><Spinner label="Loading published results..." /></div>
        ) : isError ? (
          <div className="py-12 text-center text-sm text-destructive">Failed to load results.</div>
        ) : data && data.results.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No published results match the current filters.
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
                <TableHead className="text-right text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Marks</TableHead>
                <TableHead className="text-right text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Percentage</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Result</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Published</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.results.map((r, index) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground tabular-nums font-semibold py-3.5">{(page - 1) * 20 + index + 1}</TableCell>
                  <TableCell className="py-3.5">
                    <div className="font-bold text-slate-900">{r.student_name}</div>
                    <div className="text-xs text-muted-foreground">{r.student_email}</div>
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900 py-3.5">
                    {r.class_name ? `${r.class_name}${r.section_name ? `-${r.section_name}` : ''}` : '--'}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900 py-3.5">{r.subject_name}</TableCell>
                  <TableCell className="font-semibold text-slate-900 py-3.5">{r.test_title}</TableCell>
                  <TableCell className="text-right font-bold text-indigo-600 py-3.5">
                    {parseFloat(r.obtained_marks).toFixed(1)} / {parseFloat(r.total_marks).toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-emerald-600 py-3.5">{parseFloat(r.percentage).toFixed(1)}%</TableCell>
                  <TableCell className="py-3.5">
                    <Badge variant={r.passed ? 'success' : 'destructive'}>
                      {r.passed ? 'Pass' : 'Fail'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-semibold text-slate-900 py-3.5">{formatDate(r.published_at)}</TableCell>
                </TableRow>
              ))}
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
