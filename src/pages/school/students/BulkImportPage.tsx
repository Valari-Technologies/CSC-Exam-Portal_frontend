import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Download, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
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
import { isStandardSection } from '@/lib/sections';
import { studentsService } from '@/services/students.service';
import { classLabel } from '@/lib/utils';
import { extractApiError } from '@/lib/password';
import type { BulkImportError, BulkImportLog } from '@/types';

// Mirrors apps/students/import_template.py — keep in step with it. Email is optional:
// students sign in with a Student ID, so an email is contact info, not a credential.
const REQUIRED_COLUMNS = ['full_name', 'roll_number'];
const OPTIONAL_COLUMNS = ['email', 'date_of_birth', 'admission_number', 'gender', 'parent_name', 'parent_phone'];

/** Excel needs a BOM to open a UTF-8 CSV without mangling non-ASCII names. */
const BOM = '\uFEFF';
const CRLF = '\r\n';

/** Entries without a level predate the error/warning split; treat them as errors. */
const isWarning = (entry: BulkImportError) => entry.level === 'warning';

export default function BulkImportPage() {
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState<number | ''>('');
  const [sectionId, setSectionId] = useState<number | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BulkImportLog | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<'xlsx' | 'csv' | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<number | null>(null);

  const classesQuery = useQuery({
    queryKey: ['classes-dropdown'],
    queryFn: () => classesService.list({ page_size: 100 }),
  });

  const sectionsQuery = useQuery({
    queryKey: ['sections-dropdown', classId],
    queryFn: () => sectionsService.list({ school_class: classId as number, page_size: 100 }),
    enabled: !!classId,
  });

  const logsQuery = useQuery({
    queryKey: ['import-logs'],
    queryFn: () => studentsService.importLogs(),
  });

  const importMutation = useMutation({
    mutationFn: (formData: FormData) => studentsService.bulkImport(formData),
    onSuccess: async (data) => {
      setResult(data);
      setFile(null);
      setUploadError(null);
      await queryClient.invalidateQueries({ queryKey: ['import-logs'] });
      // New students exist now — the lists and dashboards counting them are stale.
      await queryClient.invalidateQueries({ queryKey: ['students'] });
      await queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
    },
    onError: (err) => {
      setResult(null);
      setUploadError(extractApiError(err, 'The file could not be imported.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => studentsService.deleteImportLog(id),
    onSuccess: async (_data, id) => {
      setConfirmingDelete(null);
      // If the record on screen is the one just deleted, drop it too.
      setResult((current) => (current?.id === id ? null : current));
      await queryClient.invalidateQueries({ queryKey: ['import-logs'] });
    },
  });

  const handleImport = () => {
    if (!file || !classId || !sectionId) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('school_class', String(classId));
    fd.append('section', String(sectionId));
    importMutation.mutate(fd);
  };

  const handleDownloadTemplate = async (fileFormat: 'xlsx' | 'csv') => {
    setDownloading(fileFormat);
    try {
      const blob = await studentsService.downloadImportTemplate(fileFormat);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `student_import_template.${fileFormat}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setUploadError('The template could not be downloaded. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  /** The credentials sheet the admin hands out. Built in the browser from the response —
   *  the server never stores these passwords, so there is nothing to re-download later. */
  const handleDownloadCredentials = () => {
    if (!result?.credentials?.length) return;
    const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = [
      ['Full Name', 'Roll Number', 'Student ID', 'Password'],
      ...result.credentials.map((c) => [c.full_name, c.roll_number, c.student_id, c.password]),
    ];
    // Excel opens a CSV without a BOM as mojibake for non-ASCII names.
    const csv = BOM + rows.map((r) => r.map(escape).join(',')).join(CRLF);
    const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `student_credentials_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const statusVariant = (s: string) =>
    s === 'completed' ? 'success' : s === 'failed' ? 'destructive' : 'warning';

  const renderEntries = (entries: BulkImportError[]) => {
    const errors = entries.filter((e) => !isWarning(e));
    const warnings = entries.filter(isWarning);
    return (
      <div className="space-y-2">
        {errors.length > 0 && (
          <div>
            <p className="text-xs font-medium text-destructive">
              {errors.length === 1 ? '1 problem' : `${errors.length} problems`} — these students were not imported
            </p>
            <ul className="mt-1 space-y-0.5 ml-4 list-disc text-xs">
              {errors.map((e, i) => (
                <li key={i}>{e.row > 0 ? `Row ${e.row}: ` : ''}{e.error}</li>
              ))}
            </ul>
          </div>
        )}
        {warnings.length > 0 && (
          <div>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-500">
              {warnings.length === 1 ? '1 note' : `${warnings.length} notes`} — imported, but worth a look
            </p>
            <ul className="mt-1 space-y-0.5 ml-4 list-disc text-xs text-muted-foreground">
              {warnings.map((e, i) => (
                <li key={i}>{e.row > 0 ? `Row ${e.row}: ` : ''}{e.error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bulk Import Students</h1>
        <p className="text-sm text-muted-foreground">Upload a file to create multiple student accounts at once.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Upload Student File</CardTitle>
          <CardDescription>
            Start from the template — it already has the headings in the format the importer expects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border p-4 bg-muted/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium">Download a template</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={downloading !== null}
                  onClick={() => handleDownloadTemplate('xlsx')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {downloading === 'xlsx' ? 'Preparing…' : 'Excel (.xlsx)'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={downloading !== null}
                  onClick={() => handleDownloadTemplate('csv')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {downloading === 'csv' ? 'Preparing…' : 'CSV'}
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                Required: <span className="font-mono text-foreground">{REQUIRED_COLUMNS.join(', ')}</span>
              </p>
              <p>
                Optional: <span className="font-mono">{OPTIONAL_COLUMNS.join(', ')}</span>
              </p>
              <p>
                Class and section come from the pickers below, so they are not columns in the file.
                The template includes two example rows — delete them before uploading.
              </p>
              <p>
                Email is optional — leave it blank for students who have none. Each imported
                student is given a Student ID and password, shown once after the upload.
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Supported formats: <span className="font-mono">.csv, .xlsx, .txt, .docx</span>. Max 5 MB.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Class</Label>
              <select
                value={classId}
                onChange={(e) => { setClassId(Number(e.target.value) || ''); setSectionId(''); }}
                className="w-full py-2 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select class</option>
                {classesQuery.data?.results.map((c) => (
                  <option key={c.id} value={c.id}>{classLabel(c)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Section</Label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(Number(e.target.value) || '')}
                disabled={!classId}
                className="w-full py-2 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select section</option>
                {/* Same A-F guard as the Add/Edit Student form: the API returns whatever
                    sections exist and the Section model allows any name, so an import
                    can't be aimed at one outside the supported range. */}
                {(sectionsQuery.data?.results ?? [])
                  .filter((s) => isStandardSection(s.name))
                  .map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Student File</Label>
            <input
              type="file"
              accept=".csv,.xlsx,.txt,.docx"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setUploadError(null); }}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {file && <p className="text-xs text-muted-foreground">Selected: {file.name}</p>}
          </div>
          <Button
            variant="gradient"
            disabled={!file || !classId || !sectionId || importMutation.isPending}
            onClick={handleImport}
          >
            {importMutation.isPending ? 'Importing…' : 'Import Students'}
          </Button>

          {uploadError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{uploadError}</p>
            </div>
          )}

          {result && (
            <div className="rounded-md border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant(result.status)}>{result.status}</Badge>
                <span className="text-sm font-mono">{result.file_name}</span>
              </div>
              <p className="text-sm">
                {result.success_count} of {result.total_rows} imported successfully.
                {result.fail_count > 0 && ` ${result.fail_count} could not be imported.`}
              </p>
              {result.errors.length > 0 && renderEntries(result.errors)}
              {result.credentials && result.credentials.length > 0 && (
                <div className="rounded-md border border-primary/40 bg-primary/5 p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        Login credentials for {result.credentials.length}{' '}
                        {result.credentials.length === 1 ? 'student' : 'students'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Shown once. The passwords are not stored, so download them now —
                        after you leave this page they cannot be recovered, only reset.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleDownloadCredentials}>
                      <Download className="mr-2 h-4 w-4" />
                      Download CSV
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded border bg-background">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Roll</TableHead>
                          <TableHead>Student ID</TableHead>
                          <TableHead>Password</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.credentials.map((c) => (
                          <TableRow key={c.student_id}>
                            <TableCell className="text-sm">{c.full_name}</TableCell>
                            <TableCell className="text-sm">{c.roll_number}</TableCell>
                            <TableCell className="font-mono text-xs">{c.student_id}</TableCell>
                            <TableCell className="font-mono text-xs">{c.password}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
          <CardDescription>
            A record of past uploads. Deleting a record removes only the record — the students it
            imported keep their accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deleteMutation.isError && (
            <p className="mb-3 text-sm text-destructive">
              {extractApiError(deleteMutation.error, 'Could not delete that import record.')}
            </p>
          )}
          {logsQuery.isLoading ? (
            <Spinner label="Loading logs…" />
          ) : !logsQuery.data || logsQuery.data.results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No imports yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Success</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsQuery.data.results.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">{log.file_name}</TableCell>
                    <TableCell>{log.total_rows}</TableCell>
                    <TableCell>{log.success_count}</TableCell>
                    <TableCell>{log.fail_count}</TableCell>
                    <TableCell><Badge variant={statusVariant(log.status)}>{log.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {confirmingDelete === log.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-muted-foreground">Delete this record?</span>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(log.id)}
                          >
                            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setConfirmingDelete(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete import record for ${log.file_name}`}
                          onClick={() => setConfirmingDelete(log.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
