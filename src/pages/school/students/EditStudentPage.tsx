import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/Spinner';
import { studentsService } from '@/services/students.service';
import type { StudentProfileDetail, StudentWriteRequest } from '@/types';
import StudentCredentialsPanel from './StudentCredentialsPanel';
import StudentForm from './StudentForm';

export default function EditStudentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetResult, setResetResult] = useState<StudentProfileDetail | null>(null);

  const { data: student, isLoading, isError } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsService.get(Number(id)),
    enabled: !!id,
  });

  if (isLoading) return <Spinner label="Loading student…" />;
  if (isError || !student) return <p className="text-sm text-destructive">Student not found.</p>;

  const handleSubmit = async (data: StudentWriteRequest) => {
    setIsSubmitting(true);
    try {
      const updated = await studentsService.update(Number(id), data);
      // Refresh cached list + detail so the updated status/fields show immediately
      // (QueryClient staleTime is 30s, so cached views would otherwise be stale).
      await queryClient.invalidateQueries({ queryKey: ['students'] });
      await queryClient.invalidateQueries({ queryKey: ['student'] });

      // A new password only comes back on the response that set it. Stop and show it,
      // exactly as create does — otherwise the admin has no way to read it back.
      if (updated.initial_password) {
        setResetResult(updated);
        return;
      }
      navigate(`/school/students/${id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (resetResult) {
    return (
      <StudentCredentialsPanel
        student={resetResult}
        mode="password-reset"
        onDone={() => navigate(`/school/students/${id}`)}
      />
    );
  }

  return (
    <StudentForm
      title="Edit Student"
      initialData={student}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />
  );
}
