import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

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
import { studentsService } from '@/services/students.service';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDelete, setShowDelete] = useState(false);

  const { data: student, isLoading, isError } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsService.get(Number(id)),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => studentsService.remove(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      navigate('/school/students');
    },
  });

  if (isLoading) return <Spinner label="Loading student…" />;
  if (isError || !student) return <p className="text-sm text-destructive">Student not found.</p>;

  const info = [
    // First, and always shown: the Student ID is what the student actually signs in with,
    // and email is optional. It appeared in the header only as a fallback for students
    // without an email, so a student who had one showed their ID nowhere on this page.
    ['Student ID', student.student_id || '—'],
    ['Email', student.user.email || '—'],
    ['Class', student.class_name],
    // Matches the list: the Class row above already names the class, so this is the
    // section on its own rather than the combined "1-A".
    ['Section', student.display_section],
    ['Roll Number', student.roll_number],
    ['Admission Number', student.admission_number || '—'],
    ['Date of Birth', student.date_of_birth || '—'],
    ['Gender', student.gender || '—'],
    ['Parent Name', student.parent_name || '—'],
    ['Parent Phone', student.parent_phone || '—'],
    ['School', student.school_name],
    ['School ID', student.school_code],
    ['Enrolled', new Date(student.enrollment_date).toLocaleDateString()],
    ['Last Login', student.user.last_login ? new Date(student.user.last_login).toLocaleString() : 'Never'],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{student.user.full_name}</h1>
          {/* Student ID leads: it is the credential they sign in with, and email is
              optional. Email trails it when there is one, rather than replacing it. */}
          <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
            <span className="font-mono font-medium text-foreground">
              {student.student_id || '—'}
            </span>
            {student.user.email && <span>· {student.user.email}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/school/students/${id}/edit`}><Edit className="mr-2 h-4 w-4" /> Edit</Link>
          </Button>
          <Button variant="destructive" onClick={() => setShowDelete(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Deactivate
          </Button>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Profile
            <Badge variant={student.is_active ? 'success' : 'destructive'}>
              {student.is_active ? 'Active' : 'Inactive'}
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

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate student?</DialogTitle>
            <DialogDescription>
              This will deactivate <strong>{student.user.full_name}</strong>. Their data will be preserved.
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
