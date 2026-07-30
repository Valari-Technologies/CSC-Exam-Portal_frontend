import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Edit, FileUp, Plus, Search, Trash2, X, FileQuestion } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { CustomSelect } from '@/components/ui/CustomSelect';
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
import { subjectsService } from '@/services/academics.service';
import { questionsService } from '@/services/questions.service';
import { teachersService } from '@/services/teachers.service';
import { useAuth } from '@/hooks/useAuth';
import type { Difficulty, NamedRef, QuestionListItem } from '@/types';
import questionBankHeaderImg from '@/assets/dashboard_designs/question bank/question bank header.png';

const DIFFICULTY_VARIANT: Record<Difficulty, 'success' | 'warning' | 'destructive'> = {
  easy: 'success',
  medium: 'warning',
  hard: 'destructive',
};

// A bounded-large fetch so the whole bank can be grouped by subject client-side
// without a subject's questions being split across pages.
const FETCH_SIZE = 200;

// Columns rendered per question row (the subject lives in the group header).
const COLUMN_COUNT = 8;

interface SubjectGroup {
  subject: NamedRef;
  items: QuestionListItem[];
}

const CHECKBOX_CLASS = 'h-4 w-4 rounded border-input accent-primary cursor-pointer';

export default function QuestionBankPage() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [classFilter, setClassFilter] = useState<number | ''>('');
  const [sectionFilter, setSectionFilter] = useState<number | ''>('');
  const [subjectFilter, setSubjectFilter] = useState<number | ''>('');
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | ''>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active');
  const [pendingDelete, setPendingDelete] = useState<QuestionListItem | null>(null);
  const [notice, setNotice] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  // Which subject groups are COLLAPSED. Tracking the closed ones (rather than the
  // open ones) means every group starts expanded and any subject that appears
  // later — after a filter change, or a newly created one — is open by default,
  // which keeps the page behaving as it did before the accordion existed.
  const [collapsedSubjects, setCollapsedSubjects] = useState<Set<number>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  // Teacher scoping (this whole feature): a teacher may only browse the Question Bank for
  // the classes/sections assigned to them. Admins are unaffected — the extra dropdowns and
  // filtering below are all gated behind this flag, so their view is unchanged.
  const isTeacher = user?.role === 'teacher';

  const subjectsQuery = useQuery({
    queryKey: ['subjects-dropdown'],
    queryFn: () => subjectsService.list({ page_size: 200 }),
  });

  // The logged-in teacher's own assignments (the endpoint is self-scoped for teachers).
  // Fetched large so a teacher with many assignments isn't truncated at the default page.
  const assignmentsQuery = useQuery({
    queryKey: ['my-assignments-question-bank'],
    queryFn: () => teachersService.listAssignments({ page_size: 100 }),
    enabled: isTeacher,
  });

  // Distinct classes the teacher is assigned to — the Class dropdown's options.
  const assignedClasses = useMemo(() => {
    const rows = assignmentsQuery.data?.results ?? [];
    const byId = new Map<number, string>();
    for (const a of rows) byId.set(a.school_class, a.class_name);
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [assignmentsQuery.data]);

  // Assigned sections per class (only rows that name a section — a class-only assignment
  // covers all sections and contributes none here). Feeds the Section dropdown.
  const sectionsByClass = useMemo(() => {
    const rows = assignmentsQuery.data?.results ?? [];
    const map = new Map<number, Map<number, string>>();
    for (const a of rows) {
      if (a.section == null) continue;
      const inner = map.get(a.school_class) ?? new Map<number, string>();
      inner.set(a.section, a.section_name ?? String(a.section));
      map.set(a.school_class, inner);
    }
    return map;
  }, [assignmentsQuery.data]);

  // The subjects a teacher is assigned, as two rules combined below: a subject-bound
  // assignment grants that one subject; a whole-class assignment (no subject named) grants
  // every subject of that class. Mirrors the backend scoping in QuestionViewSet.
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

  const assignedSections = useMemo(() => {
    if (classFilter === '') return [];
    const inner = sectionsByClass.get(classFilter);
    if (!inner) return [];
    return Array.from(inner, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [classFilter, sectionsByClass]);

  // Subjects visible to a teacher: only the subjects assigned to them (see
  // assignedSubjectScope). The Class dropdown further narrows to the class in focus.
  // Admins see all subjects.
  const visibleSubjects = useMemo(() => {
    const all = subjectsQuery.data?.results ?? [];
    if (!isTeacher) return all;
    const { wholeClassIds, namedSubjectIds } = assignedSubjectScope;
    const assigned = all.filter(
      (s) => namedSubjectIds.has(s.id) || wholeClassIds.has(s.school_class),
    );
    if (classFilter === '') return assigned;
    return assigned.filter((s) => s.school_class === classFilter);
  }, [isTeacher, subjectsQuery.data, classFilter, assignedSubjectScope]);

  // Subject ids a teacher's question list is restricted to. null = no restriction (admin).
  // The questions API can't filter by class, so scoping is applied over subject ids here.
  const allowedSubjectIds = useMemo(
    () => (isTeacher ? new Set(visibleSubjects.map((s) => s.id)) : null),
    [isTeacher, visibleSubjects],
  );

  const onClassFilterChange = (value: number | '') => {
    setClassFilter(value);
    // A section/subject from the previous class no longer applies.
    setSectionFilter('');
    setSubjectFilter('');
  };

  const questionsQuery = useQuery({
    queryKey: [
      'questions',
      {
        search,
        subject: subjectFilter || undefined,
        difficulty: difficultyFilter || undefined,
        status: statusFilter,
      },
    ],
    queryFn: () =>
      questionsService.list({
        page_size: FETCH_SIZE,
        search: search || undefined,
        subject: subjectFilter || undefined,
        difficulty: difficultyFilter || undefined,
        is_active: statusFilter === 'active',
      }),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => questionsService.remove(id),
    onSuccess: (result, id) => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      setPendingDelete(null);
      deselect(id);
      if (result.archived) {
        setNotice({
          kind: 'info',
          text:
            result.detail ??
            'This question is used in existing tests or exams, so it was archived instead of being permanently deleted.',
        });
      } else {
        setNotice({ kind: 'info', text: 'Question deleted.' });
      }
    },
    onError: () => {
      setPendingDelete(null);
      setNotice({ kind: 'error', text: 'Failed to delete the question. Please try again.' });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => questionsService.bulkRemove(ids),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      setBulkDeleteOpen(false);
      setSelectedIds(new Set());

      const parts: string[] = [];
      if (result.deleted) parts.push(`${result.deleted} deleted`);
      if (result.archived) {
        parts.push(
          `${result.archived} archived (used in existing tests or exams, so exam history is kept)`,
        );
      }
      setNotice({
        kind: 'info',
        text: parts.length ? `${parts.join(', ')}.` : 'No questions were removed.',
      });
    },
    onError: () => {
      setBulkDeleteOpen(false);
      setNotice({ kind: 'error', text: 'Failed to delete the selected questions. Please try again.' });
    },
  });

  // Group the fetched questions by subject, preserving the API order within each
  // group and sorting the groups alphabetically by subject name.
  const groups = useMemo<SubjectGroup[]>(() => {
    const list = questionsQuery.data?.results ?? [];
    const map = new Map<number, SubjectGroup>();
    for (const q of list) {
      // Teacher scoping: keep only questions whose subject belongs to an assigned class.
      if (allowedSubjectIds && !allowedSubjectIds.has(q.subject.id)) continue;
      const existing = map.get(q.subject.id);
      if (existing) {
        existing.items.push(q);
      } else {
        map.set(q.subject.id, { subject: q.subject, items: [q] });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.subject.name.localeCompare(b.subject.name));
  }, [questionsQuery.data, allowedSubjectIds]);

  const totalCount = questionsQuery.data?.count ?? 0;

  // Ids currently rendered — "Select all" covers exactly what the user can see.
  // A collapsed group contributes nothing, which is what keeps that promise true
  // and stops a bulk delete from reaching questions that are hidden off-screen.
  const visibleIds = useMemo(
    () =>
      groups
        .filter((g) => !collapsedSubjects.has(g.subject.id))
        .flatMap((g) => g.items.map((q) => q.id)),
    [groups, collapsedSubjects],
  );

  const toggleSubject = (subjectId: number) => {
    setCollapsedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  };

  // Selection is keyed by id, so a filter change — or collapsing a group — would
  // leave stale ids behind and make the bulk-delete count lie. Drop anything no
  // longer on screen. Collapsing a subject therefore clears its selection: the
  // alternative is a "Delete selected" that acts on rows the user cannot see.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(visibleIds);
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleIds]);

  const selectedCount = selectedIds.size;
  const allVisibleSelected = visibleIds.length > 0 && selectedCount === visibleIds.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedCount > 0 && !allVisibleSelected;
    }
  }, [selectedCount, allVisibleSelected]);

  const deselect = (id: number) => {
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(allVisibleSelected ? new Set() : new Set(visibleIds));
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const classOptions = [
    { value: '', label: 'All my classes' },
    ...assignedClasses.map((c) => ({ value: String(c.id), label: `Class ${c.name}` }))
  ];

  const sectionOptions = [
    { value: '', label: 'All sections' },
    ...assignedSections.map((s) => ({ value: String(s.id), label: s.name }))
  ];

  const subjectOptions = [
    { value: '', label: isTeacher ? 'Assigned subjects' : 'All subjects' },
    ...visibleSubjects.map((s) => ({ value: String(s.id), label: `${s.name} (${s.class_name})` }))
  ];

  const difficultyOptions = [
    { value: '', label: 'All difficulties' },
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' }
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Archived / Inactive' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Card with question bank header.png background */}
      <div className="relative group rounded-[20px] overflow-hidden shadow-sm border border-slate-200/60 min-h-[160px] md:min-h-[180px] flex items-center bg-[#f0f4ff]">
        <img
          src={questionBankHeaderImg}
          alt="Question Bank Header"
          className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
        />
        {/* Overlay to ensure high contrast/readability for the text */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[0.5px]"></div>
        
        <div className="relative z-10 w-full p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] tracking-tight flex items-center gap-3 flex-wrap leading-tight drop-shadow-sm">
              <FileQuestion className="h-7 w-7 text-indigo-600 animate-pulse" />
              Question Bank
            </h1>
            <p className="text-slate-700 text-xs sm:text-sm mt-2 leading-relaxed font-semibold drop-shadow-sm max-w-xl">
              MCQ questions grouped by subject.
            </p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap z-10">
            <Button variant="outline" onClick={() => navigate('/questions/bulk-import')} className="bg-white/80 backdrop-blur-xs border-slate-300 hover:bg-white">
              <FileUp className="mr-2 h-4 w-4" /> Bulk Import
            </Button>
            <Button variant="gradient" onClick={() => navigate('/questions/new')} className="shadow-md">
              <Plus className="mr-2 h-4 w-4" /> New Question
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-xs flex items-center gap-3 flex-wrap">
        <form onSubmit={onSearchSubmit} className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search question text..."
            className="pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm w-full focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </form>
        {isTeacher && (
          <>
            <CustomSelect
              options={classOptions}
              value={String(classFilter)}
              onChange={(val) => onClassFilterChange(val ? Number(val) : '')}
              placeholder="All my classes"
              containerClassName="w-44"
            />
            <CustomSelect
              options={sectionOptions}
              value={String(sectionFilter)}
              onChange={(val) => setSectionFilter(val ? Number(val) : '')}
              disabled={classFilter === '' || assignedSections.length === 0}
              placeholder="All sections"
              containerClassName="w-44"
            />
          </>
        )}
        <CustomSelect
          options={subjectOptions}
          value={String(subjectFilter)}
          onChange={(val) => setSubjectFilter(val ? Number(val) : '')}
          placeholder={isTeacher ? 'Assigned subjects' : 'All subjects'}
          containerClassName="w-56"
        />
        <CustomSelect
          options={difficultyOptions}
          value={difficultyFilter}
          onChange={(val) => setDifficultyFilter((val as Difficulty) || '')}
          placeholder="All difficulties"
          containerClassName="w-48"
        />
        <CustomSelect
          options={statusOptions}
          value={statusFilter}
          onChange={(val) => setStatusFilter(val as 'active' | 'inactive')}
          placeholder="Active"
          containerClassName="w-48"
        />
      </div>

      {/* Bulk selection toolbar */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
          <span className="font-bold text-slate-800">
            {selectedCount} question{selectedCount === 1 ? '' : 's'} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Clear selection
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete selected
            </Button>
          </div>
        </div>
      )}

      {/* Notice (archive / delete / error feedback — no toast system in app) */}
      {notice && (
        <div
          className={
            'flex items-start justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm ' +
            (notice.kind === 'error'
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-primary/30 bg-primary/10 text-foreground')
          }
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Grouped table */}
      <div className="border border-slate-200/60 rounded-2xl overflow-hidden shadow-xs bg-white">
        {questionsQuery.isLoading ? (
          <div className="py-12">
            <Spinner label="Loading questions..." />
          </div>
        ) : questionsQuery.isError ? (
          <div className="py-12 text-center text-sm text-destructive">Failed to load questions.</div>
        ) : groups.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No questions found.{' '}
            {search || classFilter || sectionFilter || subjectFilter || difficultyFilter || statusFilter === 'inactive'
              ? 'Try clearing filters.'
              : 'Add your first question.'}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-10">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    className={CHECKBOX_CLASS}
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    aria-label="Select all questions"
                  />
                </TableHead>
                <TableHead className="w-16 text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">S.No</TableHead>
                <TableHead className="w-[42%] text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Question</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Chapter</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Difficulty</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Marks</TableHead>
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Status</TableHead>
                <TableHead className="text-right text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => {
                const isCollapsed = collapsedSubjects.has(group.subject.id);
                return (
                <Fragment key={group.subject.id}>
                  <TableRow className="bg-slate-100/60 hover:bg-slate-100/60 border-y border-slate-200/40">
                    <TableCell colSpan={COLUMN_COUNT} className="p-0">
                      {/* The whole header is the control, not just the chevron —
                          a 20px hit target on a full-width row is a needless
                          miss. A real <button> keeps it keyboard- and
                          screen-reader-operable inside the table. */}
                      <button
                        type="button"
                        onClick={() => toggleSubject(group.subject.id)}
                        aria-expanded={!isCollapsed}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-bold text-slate-800 hover:bg-slate-200/40 focus:outline-none"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-550" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0 text-slate-550" />
                        )}
                        {group.subject.name}
                        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {group.items.length} question{group.items.length === 1 ? '' : 's'}
                        </span>
                      </button>
                    </TableCell>
                  </TableRow>
                  {!isCollapsed && group.items.map((q, index) => (
                    <TableRow key={q.id} data-state={selectedIds.has(q.id) ? 'selected' : undefined}>
                      <TableCell className="py-3.5">
                        <input
                          type="checkbox"
                          className={CHECKBOX_CLASS}
                          checked={selectedIds.has(q.id)}
                          onChange={() => toggleOne(q.id)}
                          aria-label={`Select question: ${q.question_text}`}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums font-semibold py-3.5">{index + 1}</TableCell>
                      <TableCell className="font-bold text-slate-900 text-sm py-3.5">{q.question_text}</TableCell>
                      <TableCell className="text-sm font-semibold text-slate-800 py-3.5">{q.chapter.name}</TableCell>
                      <TableCell className="py-3.5">
                        <Badge variant={DIFFICULTY_VARIANT[q.difficulty]}>{q.difficulty}</Badge>
                      </TableCell>
                      <TableCell className="font-bold text-indigo-600 py-3.5">{q.marks}</TableCell>
                      <TableCell className="py-3.5">
                        <Badge variant={q.is_active ? 'success' : 'secondary'}>
                          {q.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-3.5">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/questions/${q.id}/edit`)}
                            aria-label="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPendingDelete(q)}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {totalCount > FETCH_SIZE && (
        <p className="text-xs text-muted-foreground mt-2">
          Showing the first {FETCH_SIZE} of {totalCount} questions. Use the filters to narrow the
          list.
        </p>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete question?</DialogTitle>
            <DialogDescription>
              This permanently deletes the question. If it is already used in a test or exam, it will
              be archived (hidden from the active bank) instead, so existing results stay intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
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

      {/* Bulk delete confirmation dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={(open) => !open && setBulkDeleteOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {selectedCount} question{selectedCount === 1 ? '' : 's'}?
            </DialogTitle>
            <DialogDescription>
              This permanently deletes the selected questions. Any that are already used in a test or
              exam will be archived (hidden from the active bank) instead, so existing results stay
              intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={bulkDeleteMutation.isPending}
              onClick={() => bulkDeleteMutation.mutate([...selectedIds])}
            >
              {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${selectedCount}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
