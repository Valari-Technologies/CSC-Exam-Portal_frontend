import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, Download, FileUp } from 'lucide-react';

import api from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { questionsService } from '@/services/questions.service';
import type { QuestionBulkImportResult } from '@/services/questions.service';

export default function BulkImportQuestionsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<QuestionBulkImportResult | null>(null);

  const importMutation = useMutation({
    mutationFn: (formData: FormData) => questionsService.bulkImport(formData),
    onSuccess: (data) => {
      setResult(data);
      setFile(null);
    },
  });

  const handleImport = () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    importMutation.mutate(fd);
  };

  const handleDownloadTemplate = async () => {
    const response = await api.get('/questions/import-template/', {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'question_import_template.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Import Questions</CardTitle>
          <CardDescription>
            Upload a file to import many questions at once. Supported formats: CSV, Excel (.xlsx/.xls), JSON, Text (.txt), and Word (.docx).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border p-4 bg-muted/40 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Expected columns</p>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Column</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs">question_text</TableCell>
                  <TableCell><Badge variant="default">Required</Badge></TableCell>
                  <TableCell className="text-sm">The question text</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">option_a, option_b, option_c, option_d</TableCell>
                  <TableCell><Badge variant="default">Required</Badge></TableCell>
                  <TableCell className="text-sm">Answer choices</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">correct_option</TableCell>
                  <TableCell><Badge variant="default">Required</Badge></TableCell>
                  <TableCell className="text-sm">a, b, c, or d</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">subject_id</TableCell>
                  <TableCell><Badge variant="default">Required</Badge></TableCell>
                  <TableCell className="text-sm">
                    The Subject ID from the Subjects page, e.g.{' '}
                    <span className="font-mono">KA_MAT_10</span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">chapter_name (or chapter_id)</TableCell>
                  <TableCell><Badge variant="default">Required</Badge></TableCell>
                  <TableCell className="text-sm">Chapter name OR numeric ID</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">difficulty</TableCell>
                  <TableCell><Badge variant="default">Required</Badge></TableCell>
                  <TableCell className="text-sm">easy, medium, or hard</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">marks</TableCell>
                  <TableCell><Badge variant="default">Required</Badge></TableCell>
                  <TableCell className="text-sm">Points for correct answer</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">explanation</TableCell>
                  <TableCell><Badge variant="outline">Optional</Badge></TableCell>
                  <TableCell className="text-sm">Answer explanation</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">negative_marks</TableCell>
                  <TableCell><Badge variant="outline">Optional</Badge></TableCell>
                  <TableCell className="text-sm">Penalty for wrong answer (default 0)</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground">
              Subjects are matched by their Subject ID (e.g.{' '}
              <span className="font-mono">KA_MAT_10</span>) rather than by name, because the
              same subject name is used across every class. Find each Subject ID under
              Academics → Subjects; the downloaded template is pre-filled with IDs from your
              school.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Question File</Label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.json,.txt,.docx"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            <p className="text-xs text-muted-foreground">
              Supported formats: .csv, .xlsx, .xls, .json, .txt, .docx
            </p>
          </div>

          <Button
            variant="gradient"
            disabled={!file || importMutation.isPending}
            onClick={handleImport}
          >
            <FileUp className="mr-2 h-4 w-4" />
            {importMutation.isPending ? 'Importing...' : 'Import Questions'}
          </Button>

          {importMutation.isError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">
                Upload failed. Please check your file and try again.
              </p>
            </div>
          )}

          {result && result.errors.length === 1 && result.errors[0].row === 0 && (
            <div className="rounded-md border-2 border-destructive bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-destructive">
                    File format error — no questions were imported
                  </p>
                  <p className="text-sm text-destructive">
                    {result.errors[0].error}
                  </p>
                  <p className="text-xs text-muted-foreground pt-2">
                    Tip: Click "Download Template" above to get a correctly
                    formatted file with example questions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="rounded-md border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Badge variant={result.fail === 0 && result.success > 0 ? 'success' : result.success > 0 ? 'warning' : 'destructive'}>
                  {result.fail === 0 && result.success > 0 ? 'Success' : result.success > 0 ? 'Partial' : 'Failed'}
                </Badge>
                <span className="text-sm font-medium">Import Results</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="rounded-md border p-3">
                  <p className="text-2xl font-bold">{result.total}</p>
                  <p className="text-xs text-muted-foreground">Total Rows</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-2xl font-bold text-green-600">{result.success}</p>
                  <p className="text-xs text-muted-foreground">Imported</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-2xl font-bold text-red-600">{result.fail}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>

              {result.errors.length > 0 &&
                !(result.errors.length === 1 && result.errors[0].row === 0) && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-destructive font-medium">
                    View {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}
                  </summary>
                  <div className="mt-2 max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Row</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.errors.map((err, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{err.row}</TableCell>
                            <TableCell className="text-xs text-destructive">{err.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
