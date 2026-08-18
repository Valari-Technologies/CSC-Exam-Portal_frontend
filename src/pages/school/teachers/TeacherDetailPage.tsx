import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { GENDER_OPTIONS } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { teachersService } from '@/services/teachers.service';
import { useState } from 'react';

export default function TeacherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDelete, setShowDelete] = useState(false);

  const { data: teacher, isLoading, isError } = useQuery({
    queryKey: ['teacher', id],
    queryFn: () => teachersService.get(Number(id)),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => teachersService.remove(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      navigate('/school/teachers');
    },
  });

  if (isLoading) return <Spinner label="Loading teacher…" />;
  if (isError || !teacher) return <p className="text-sm text-destructive">Teacher not found.</p>;

  const info = [
    ['Email', teacher.user.email],
    ['Teacher ID', teacher.teacher_id || '—'],
    ['Employee ID', teacher.employee_id || '—'],
    ['Contact Number', teacher.contact_number || '—'],
    ['Gender', GENDER_OPTIONS.find((g) => g.value === teacher.gender)?.label ?? '—'],
    ['Qualification', teacher.qualification || '—'],
    ['Joining Date', teacher.joining_date || '—'],
    ['School', teacher.school_name],
    ['School ID', teacher.school_code],
    ['Last Login', teacher.user.last_login ? new Date(teacher.user.last_login).toLocaleString() : 'Never'],
    ['Account Created', new Date(teacher.user.created_at).toLocaleDateString()],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{teacher.user.full_name}</h1>
          <p className="text-sm text-muted-foreground">{teacher.user.email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/school/teachers/${id}/edit`}><Edit className="mr-2 h-4 w-4" /> Edit</Link>
          </Button>
          <Button variant="destructive" onClick={() => setShowDelete(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Deactivate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Profile
              <Badge variant={teacher.is_active ? 'success' : 'destructive'}>
                {teacher.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              {info.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assign Class ({teacher.assignments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {teacher.assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assignments yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Year</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacher.assignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.subject_name || '—'}</TableCell>
                      <TableCell>{a.class_name}</TableCell>
                      <TableCell>{a.section_name || 'All'}</TableCell>
                      <TableCell>{a.academic_year || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate teacher?</DialogTitle>
            <DialogDescription>
              This will deactivate <strong>{teacher.user.full_name}</strong>. Their data will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
