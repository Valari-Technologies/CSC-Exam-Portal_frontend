import { Fragment, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CustomSelect } from '@/components/ui/CustomSelect';
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
import { questionsService } from '@/services/questions.service';
import type { QuestionListItem, TestStatus } from '@/types';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit,
  ListChecks,
  Plus,
  Send,
  Trash2,
  Wand2,
} from 'lucide-react';

const STATUS_BADGE: Record<TestStatus, { label: string; variant: 'default' | 'success' | 'secondary' }> = {
  draft: { label: 'Draft', variant: 'default' },
  published: { label: 'Published', variant: 'success' },
  archived: { label: 'Archived', variant: 'secondary' },
};

// The picker groups by chapter, so it must hold the whole bank for the subject at
// once — a chapter split across a hidden page boundary defeats the grouping.
// QuestionViewSet uses LargePagination (max 500), so this is honoured.
const PICKER_FETCH_SIZE = 1000;

// Checkbox + Question + Difficulty + Marks — the span for a chapter header row.
const PICKER_COLUMN_COUNT = 4;

interface ChapterGroup {
  chapterId: number;
  chapterName: string;
  items: QuestionListItem[];
}

export default function TestPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const testId = Number(id);

  const [showQuestionPicker, setShowQuestionPicker] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [autoGenCount, setAutoGenCount] = useState(10);
  const [autoGenDifficulty, setAutoGenDifficulty] = useState<string>('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [questionSearch, setQuestionSearch] = useState('');
  const [selectedChapterIdFilter, setSelectedChapterIdFilter] = useState<number | 'all'>('all');
  const [selectedLessonFilter, setSelectedLessonFilter] = useState<string>('all');
  // Which chapter groups are COLLAPSED — tracking the closed ones keeps every
  // group open by default, including any that appears after a search changes.
  const [collapsedChapters, setCollapsedChapters] = useState<Set<number>>(new Set());

  const { data: test, isLoading, isError } = useQuery({
    queryKey: ['test', id],
    queryFn: () => testsService.get(testId),
    enabled: !!id,
  });

  // Fetch available questions for the picker (filtered by test subject)
  // Goes through the service rather than a raw api.get so the response is typed as
  // QuestionListItem — the shape this endpoint actually returns. It was previously
  // annotated `Question` (the DETAIL shape), which happened to work only because the
  // fields being read overlapped; `chapter` does not overlap (list nests {id, name},
  // detail has a flat id plus chapter_name), and grouping needs it.
  const questionsQuery = useQuery({
    queryKey: ['available-questions', test?.subject, questionSearch],
    queryFn: () =>
      questionsService.list({
        subject: test?.subject,
        is_active: true,
        page_size: PICKER_FETCH_SIZE,
        search: questionSearch || undefined,
      }),
    enabled: showQuestionPicker && !!test?.subject,
    placeholderData: keepPreviousData,
  });

  const publishMutation = useMutation({
    mutationFn: () => testsService.publish(testId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test', id] });
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      setShowPublishConfirm(false);
      // Publishing only makes a test assignable — it doesn't reach a single student until
      // it is assigned. Go straight there rather than leaving the teacher on a page whose
      // only remaining action is the one they now have to find.
      navigate(`/tests/${testId}/assign`);
    },
  });

  const addQuestionsMutation = useMutation({
    mutationFn: (questionIds: number[]) => testsService.addQuestions(testId, questionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test', id] });
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      setShowQuestionPicker(false);
      setSelectedQuestionIds([]);
    },
  });

  const removeQuestionsMutation = useMutation({
    mutationFn: (questionIds: number[]) => testsService.removeQuestions(testId, questionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test', id] });
      queryClient.invalidateQueries({ queryKey: ['tests'] });
    },
  });

  const autoGenerateMutation = useMutation({
    mutationFn: (params: { count: number; difficulty?: string }) =>
      testsService.autoGenerate(testId, {
        count: params.count,
        difficulty: params.difficulty || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test', id] });
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      setShowAutoGenerate(false);
      setAutoGenCount(10);
      setAutoGenDifficulty('');
    },
  });

  const toggleQuestion = (qid: number) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(qid) ? prev.filter((x) => x !== qid) : [...prev, qid],
    );
  };

  const toggleChapter = (chapterId: number) => {
    setCollapsedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  // Group the picker's questions by chapter. The SUBJECT is not a group: a Test has a
  // single subject FK and this list is already filtered to it, so grouping by subject
  // would always produce exactly one section. It is a heading above the list instead,
  // and chapters — which genuinely vary — carry the accordion.
  const chapterGroups = useMemo<ChapterGroup[]>(() => {
    const list = questionsQuery.data?.results ?? [];
    const map = new Map<number, ChapterGroup>();
    for (const q of list) {
      // Key on chapter.id, NOT the chapter object — each parsed row carries its own
      // object instance, so keying on the reference would make every question its
      // own group.
      const existing = map.get(q.chapter.id);
      if (existing) {
        existing.items.push(q);
      } else {
        map.set(q.chapter.id, {
          chapterId: q.chapter.id,
          chapterName: q.chapter.name,
          items: [q],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.chapterName.localeCompare(b.chapterName));
  }, [questionsQuery.data]);

  const onChapterFilterChange = (val: 'all' | number) => {
    setSelectedChapterIdFilter(val);
    setSelectedLessonFilter('all');
  };

  const lessonSelectOptions = useMemo(() => {
    const list = [{ value: 'all', label: 'All Lessons' }];
    if (selectedChapterIdFilter === 'all') return list;

    const activeGroup = chapterGroups.find((g) => g.chapterId === selectedChapterIdFilter);
    if (activeGroup) {
      const uniqueLessons = new Set<string>();
      for (const q of activeGroup.items) {
        if (q.lesson) {
          uniqueLessons.add(q.lesson);
        }
      }
      for (const lesson of Array.from(uniqueLessons).sort()) {
        list.push({ value: lesson, label: lesson });
      }
    }
    return list;
  }, [selectedChapterIdFilter, chapterGroups]);
  const chaptersList = useMemo(() => {
    return chapterGroups.map((g) => ({ id: g.chapterId, name: g.chapterName }));
  }, [chapterGroups]);

  const chapterSelectOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Chapters' },
      ...chaptersList.map((ch) => ({ value: String(ch.id), label: ch.name })),
    ];
  }, [chaptersList]);

  const filteredChapterGroups = useMemo(() => {
    let groups = chapterGroups;
    if (selectedChapterIdFilter !== 'all') {
      groups = groups.filter((g) => g.chapterId === selectedChapterIdFilter);
    }
    if (selectedLessonFilter !== 'all') {
      groups = groups.map((g) => ({
        ...g,
        items: g.items.filter((q) => q.lesson === selectedLessonFilter),
      })).filter((g) => g.items.length > 0);
    }
    return groups;
  }, [chapterGroups, selectedChapterIdFilter, selectedLessonFilter]);

  if (isLoading) return <Spinner label="Loading test..." />;
  if (isError || !test) return <p className="text-sm text-destructive">Test not found.</p>;

  const badge = STATUS_BADGE[test.status];
  const existingQuestionIds = new Set(test.questions.map((q) => q.question));

  // Select All covers the questions currently on SCREEN — questions inside a collapsed
  // chapter are out of reach, as are ones already in the test (their checkbox is disabled).
  //
  // Note the deliberate difference from the Question Bank, where collapsing a group CLEARS
  // its selection: there the selection feeds a bulk DELETE, so acting on unseen rows is
  // dangerous. Here it feeds "Add questions", and collapsing a finished chapter to get at
  // the next one is the natural way to build a paper — so selections persist through a
  // collapse and only Select All is scoped to what is visible.
  const selectableVisible = filteredChapterGroups
    .filter((g) => !collapsedChapters.has(g.chapterId))
    .flatMap((g) => g.items)
    .filter((q) => !existingQuestionIds.has(q.id))
    .map((q) => q.id);
  const allVisibleSelected =
    selectableVisible.length > 0 && selectableVisible.every((qid) => selectedQuestionIds.includes(qid));

  const toggleSelectAllVisible = () => {
    setSelectedQuestionIds((prev) =>
      allVisibleSelected
        ? prev.filter((qid) => !selectableVisible.includes(qid))
        : [...new Set([...prev, ...selectableVisible])],
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{test.title}</h1>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {test.subject_name} -- {test.class_name}
            {test.created_by_name && <> -- Created by {test.created_by_name}</>}
          </p>
        </div>
        <div className="flex gap-2">
          {test.status === 'draft' && (
            <Button variant="outline" onClick={() => navigate(`/tests/${testId}/edit`)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          )}
          {test.status === 'draft' && (
            <Button
              variant="gradient"
              onClick={() => setShowPublishConfirm(true)}
              disabled={test.questions.length === 0}
            >
              <Send className="mr-2 h-4 w-4" /> Publish
            </Button>
          )}
          {test.status === 'published' && (
            <Button variant="gradient" onClick={() => navigate(`/tests/${testId}/assign`)}>
              <CalendarDays className="mr-2 h-4 w-4" /> Assign
            </Button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{test.total_marks}</p>
            <p className="text-xs text-muted-foreground">Total Marks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{test.passing_marks}</p>
            <p className="text-xs text-muted-foreground">Passing Marks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold">{test.duration_minutes}</p>
            </div>
            <p className="text-xs text-muted-foreground">Minutes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold">{test.questions.length}</p>
            </div>
            <p className="text-xs text-muted-foreground">Questions</p>
          </CardContent>
        </Card>
      </div>

      {/* Description & Instructions */}
      {(test.description || test.instructions) && (
        <Card>
          <CardContent className="p-6 space-y-4">
            {test.description && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                <p className="text-sm whitespace-pre-wrap">{test.description}</p>
              </div>
            )}
            {test.instructions && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Instructions</h3>
                <p className="text-sm whitespace-pre-wrap">{test.instructions}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className={test.shuffle_questions ? 'text-emerald-600' : 'text-muted-foreground'}>
                {test.shuffle_questions ? 'Yes' : 'No'}
              </span>
              <span className="text-muted-foreground">Shuffle Questions</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={test.shuffle_options ? 'text-emerald-600' : 'text-muted-foreground'}>
                {test.shuffle_options ? 'Yes' : 'No'}
              </span>
              <span className="text-muted-foreground">Shuffle Options</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={test.show_result_immediately ? 'text-emerald-600' : 'text-muted-foreground'}>
                {test.show_result_immediately ? 'Yes' : 'No'}
              </span>
              <span className="text-muted-foreground">Immediate Results</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={test.allow_review_after_submit ? 'text-emerald-600' : 'text-muted-foreground'}>
                {test.allow_review_after_submit ? 'Yes' : 'No'}
              </span>
              <span className="text-muted-foreground">Allow Review</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Questions ({test.questions.length})</CardTitle>
          {test.status === 'draft' && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowAutoGenerate(true)}>
                <Wand2 className="mr-1 h-4 w-4" /> Auto-Generate
              </Button>
              <Button size="sm" onClick={() => setShowQuestionPicker(true)}>
                <Plus className="mr-1 h-4 w-4" /> Add Questions
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {test.questions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No questions added yet. Add questions from the question bank.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">S.No</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Marks</TableHead>
                  {test.status === 'draft' && <TableHead className="w-16" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {test.questions.map((q, index) => (
                  <TableRow key={q.id}>
                    {/* A running 1..N count, not q.order_number: removing a
                        question leaves its order_number behind as a gap (the
                        backend never renumbers), so under a header reading
                        "S.No" the old field would show 1, 3, 4. Ordering is
                        still by order_number — only the label is positional. */}
                    <TableCell className="font-mono text-xs">{index + 1}</TableCell>
                    <TableCell className="text-sm">{q.question_text}</TableCell>
                    <TableCell>
                      <Badge variant={
                        q.difficulty === 'easy' ? 'success' :
                        q.difficulty === 'hard' ? 'destructive' : 'warning'
                      }>
                        {q.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell>{q.marks_override ?? q.marks}</TableCell>
                    {test.status === 'draft' && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeQuestionsMutation.mutate([q.question])}
                          aria-label="Remove question"
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
        </CardContent>
      </Card>

      {/* Assignment info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Assignments ({test.assignments_count})</CardTitle>
          {test.status === 'published' && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate(`/tests/${testId}/assignments`)}>
                View All
              </Button>
              <Button size="sm" onClick={() => navigate(`/tests/${testId}/assign`)}>
                <Plus className="mr-1 h-4 w-4" /> Assign
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {test.assignments_count === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {test.status === 'draft'
                ? 'Publish this test before assigning it to students.'
                : 'No assignments yet.'}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              This test has been assigned {test.assignments_count} time(s).
              <button
                className="ml-1 text-primary hover:underline"
                onClick={() => navigate(`/tests/${testId}/assignments`)}
              >
                View details
              </button>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Publish confirm dialog */}
      <Dialog open={showPublishConfirm} onOpenChange={setShowPublishConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish test?</DialogTitle>
            <DialogDescription>
              Once published, the test can be assigned to students. You will not be able to modify questions afterwards.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishConfirm(false)}>Cancel</Button>
            <Button
              variant="gradient"
              disabled={publishMutation.isPending}
              onClick={() => publishMutation.mutate()}
            >
              {publishMutation.isPending ? 'Publishing...' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-generate dialog */}
      <Dialog open={showAutoGenerate} onOpenChange={(open) => {
        if (!open) {
          setShowAutoGenerate(false);
          setAutoGenCount(10);
          setAutoGenDifficulty('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auto-Generate Questions</DialogTitle>
            <DialogDescription>
              Randomly select questions from the question bank for {test.subject_name}.
              Already-added questions will be excluded.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="auto-gen-count">Number of Questions</Label>
              <Input
                id="auto-gen-count"
                type="number"
                min={1}
                value={autoGenCount}
                onChange={(e) => setAutoGenCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auto-gen-difficulty">Difficulty</Label>
              <select
                id="auto-gen-difficulty"
                value={autoGenDifficulty}
                onChange={(e) => setAutoGenDifficulty(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Any difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {autoGenerateMutation.isError && (
            <p className="text-sm text-destructive">
              Failed to auto-generate questions. Please try again.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAutoGenerate(false)}>
              Cancel
            </Button>
            <Button
              disabled={autoGenerateMutation.isPending}
              onClick={() =>
                autoGenerateMutation.mutate({
                  count: autoGenCount,
                  difficulty: autoGenDifficulty || undefined,
                })
              }
            >
              {autoGenerateMutation.isPending ? 'Generating...' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question picker dialog */}
      <Dialog open={showQuestionPicker} onOpenChange={(open) => {
        if (!open) {
          setShowQuestionPicker(false);
          setSelectedQuestionIds([]);
          setQuestionSearch('');
          setCollapsedChapters(new Set());
          setSelectedChapterIdFilter('all');
          setSelectedLessonFilter('all');
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Questions from Bank</DialogTitle>
            <DialogDescription>
              Select questions from the bank for {test.subject_name}. Already-added questions are disabled.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center">
            <div className="w-full sm:w-56">
              <input
                type="search"
                value={questionSearch}
                onChange={(e) => setQuestionSearch(e.target.value)}
                placeholder="Search questions..."
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 bg-background text-sm font-medium transition-all duration-150 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
            <div className="w-full sm:w-56">
              <CustomSelect
                options={chapterSelectOptions}
                value={String(selectedChapterIdFilter)}
                onChange={(val) => {
                  onChapterFilterChange(val === 'all' ? 'all' : Number(val));
                }}
                placeholder="All Chapters"
              />
            </div>
            <div className="w-full sm:w-56">
              <CustomSelect
                options={lessonSelectOptions}
                value={selectedLessonFilter}
                onChange={(val) => {
                  setSelectedLessonFilter(val);
                }}
                placeholder="All Lessons"
                disabled={selectedChapterIdFilter === 'all'}
              />
            </div>
          </div>

          {questionsQuery.isLoading ? (
            <div className="py-8"><Spinner label="Loading questions..." /></div>
          ) : questionsQuery.isError ? (
            <p className="text-sm text-destructive py-4">Failed to load questions.</p>
          ) : questionsQuery.data && questionsQuery.data.results.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No questions found for this subject.</p>
          ) : (
            <>
              {/* The subject is fixed for the whole dialog (one subject per test), so it
                  is stated once here rather than repeated as a group on every row. */}
              <p className="mb-2 text-sm font-medium">
                {test.subject_name}
                <span className="ml-2 font-normal text-muted-foreground">{test.class_name}</span>
              </p>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        disabled={selectableVisible.length === 0}
                        onChange={toggleSelectAllVisible}
                        className="rounded border-input"
                        aria-label="Select all questions in the expanded chapters"
                        title="Select all in the expanded chapters"
                      />
                    </TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Marks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChapterGroups.map((group) => {
                    const isCollapsed = collapsedChapters.has(group.chapterId);
                    const selectedInGroup = group.items.filter((q) =>
                      selectedQuestionIds.includes(q.id),
                    ).length;
                    const selectableInGroup = group.items
                      .filter((q) => !existingQuestionIds.has(q.id))
                      .map((q) => q.id);
                    const allSelectableInGroupSelected =
                      selectableInGroup.length > 0 &&
                      selectableInGroup.every((qid) => selectedQuestionIds.includes(qid));
                    const someSelectableInGroupSelected =
                      selectableInGroup.some((qid) => selectedQuestionIds.includes(qid)) &&
                      !allSelectableInGroupSelected;

                    // Group questions in this chapter by lesson
                    const lessonGroups = (() => {
                      const map = new Map<string, typeof group.items>();
                      for (const q of group.items) {
                        const lessonName = q.lesson || 'No Lesson';
                        const existing = map.get(lessonName) ?? [];
                        existing.push(q);
                        map.set(lessonName, existing);
                      }
                      return Array.from(map.entries()).map(([lessonName, items]) => ({
                        lessonName,
                        items,
                      })).sort((a, b) => {
                        if (a.lessonName === 'No Lesson') return 1;
                        if (b.lessonName === 'No Lesson') return -1;
                        return a.lessonName.localeCompare(b.lessonName);
                      });
                    })();

                    return (
                      <Fragment key={group.chapterId}>
                        <TableRow className="bg-muted/60 hover:bg-muted/60">
                          <TableCell className="w-12">
                            <input
                              type="checkbox"
                              checked={allSelectableInGroupSelected}
                              disabled={selectableInGroup.length === 0}
                              ref={(el) => {
                                if (el) {
                                  el.indeterminate = someSelectableInGroupSelected;
                                }
                              }}
                              onChange={() => {
                                setSelectedQuestionIds((prev) => {
                                  if (allSelectableInGroupSelected) {
                                    return prev.filter((qid) => !selectableInGroup.includes(qid));
                                  } else {
                                    return [...new Set([...prev, ...selectableInGroup])];
                                  }
                                });
                              }}
                              className="rounded border-input"
                              aria-label={`Select all questions in ${group.chapterName}`}
                              title={`Select all in ${group.chapterName}`}
                            />
                          </TableCell>
                          <TableCell colSpan={PICKER_COLUMN_COUNT - 1} className="p-0">
                            <button
                              type="button"
                              onClick={() => toggleChapter(group.chapterId)}
                              aria-expanded={!isCollapsed}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                            >
                              {isCollapsed ? (
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                              {group.chapterName}
                              <span className="font-normal text-xs text-muted-foreground">
                                {group.items.length} question{group.items.length === 1 ? '' : 's'}
                              </span>
                              {/* Surfaced on the header so a collapsed chapter still
                                  shows it is contributing to the count in the footer. */}
                              {selectedInGroup > 0 && (
                                <span className="ml-auto text-xs font-normal text-primary">
                                  {selectedInGroup} selected
                                </span>
                              )}
                            </button>
                          </TableCell>
                        </TableRow>
                        {!isCollapsed && lessonGroups.map((lg) => {
                          const total = lg.items.length;
                          const selected = lg.items.filter(
                            (q) => selectedQuestionIds.includes(q.id) || existingQuestionIds.has(q.id)
                          ).length;
                          const remaining = total - selected;
                          const allSelected = selected === total;

                          return (
                            <Fragment key={lg.lessonName}>
                              {/* Lesson sub-header row */}
                              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                                <TableCell colSpan={4} className="py-2 px-4">
                                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                                    <span className="flex items-center gap-1.5">
                                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                                      Lesson: <strong className="text-slate-900">{lg.lessonName}</strong>
                                    </span>
                                    {allSelected ? (
                                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                                        All questions selected in this lesson ({total}/{total})
                                      </span>
                                    ) : (
                                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                                        Selected: {selected} | Remaining: {remaining} (Total: {total})
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>

                              {lg.items.map((q) => {
                                const alreadyAdded = existingQuestionIds.has(q.id);
                                const isSelected = selectedQuestionIds.includes(q.id);
                                return (
                                  <TableRow key={q.id} className={alreadyAdded ? 'opacity-50' : ''}>
                                    <TableCell>
                                      <input
                                        type="checkbox"
                                        checked={isSelected || alreadyAdded}
                                        disabled={alreadyAdded}
                                        onChange={() => toggleQuestion(q.id)}
                                        className="rounded border-input"
                                      />
                                    </TableCell>
                                    <TableCell className="text-sm">{q.question_text}</TableCell>
                                    <TableCell>
                                      <Badge variant={
                                        q.difficulty === 'easy' ? 'success' :
                                        q.difficulty === 'hard' ? 'destructive' : 'warning'
                                      }>
                                        {q.difficulty}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{q.marks}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </Fragment>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>

              {questionsQuery.data && questionsQuery.data.count > PICKER_FETCH_SIZE && (
                <p className="pt-3 text-xs text-muted-foreground">
                  Showing the first {PICKER_FETCH_SIZE} of {questionsQuery.data.count} questions.
                  Use the search box to narrow the list.
                </p>
              )}
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowQuestionPicker(false); setSelectedQuestionIds([]); }}>
              Cancel
            </Button>
            <Button
              disabled={selectedQuestionIds.length === 0 || addQuestionsMutation.isPending}
              onClick={() => addQuestionsMutation.mutate(selectedQuestionIds)}
            >
              {addQuestionsMutation.isPending
                ? 'Adding...'
                : `Add ${selectedQuestionIds.length} Question${selectedQuestionIds.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
