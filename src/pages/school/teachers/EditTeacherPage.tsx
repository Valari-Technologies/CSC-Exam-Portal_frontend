import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/Spinner';
import { teachersService } from '@/services/teachers.service';
import type { TeacherWriteRequest } from '@/types';
import TeacherForm from './TeacherForm';

export default function EditTeacherPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: teacher, isLoading, isError } = useQuery({
    queryKey: ['teacher', id],
    queryFn: () => teachersService.get(Number(id)),
    enabled: !!id,
  });

  if (isLoading) return <Spinner label="Loading teacher…" />;
  if (isError || !teacher) return <p className="text-sm text-destructive">Teacher not found.</p>;

  const handleSubmit = async (data: TeacherWriteRequest) => {
    setIsSubmitting(true);
    try {
      await teachersService.update(Number(id), data);
      // Refresh cached list + detail so the updated status/fields show immediately
      // (QueryClient staleTime is 30s, so cached views would otherwise be stale).
      await queryClient.invalidateQueries({ queryKey: ['teachers'] });
      await queryClient.invalidateQueries({ queryKey: ['teacher'] });
      navigate(`/school/teachers/${id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TeacherForm
      title="Edit Teacher"
      initialData={teacher}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />
  );
}
