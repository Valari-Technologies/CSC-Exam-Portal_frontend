import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/Spinner';
import { testsService } from '@/services/tests.service';
import type { TestWriteRequest } from '@/types';
import TestForm from './TestForm';

export default function EditTestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: test, isLoading, isError } = useQuery({
    queryKey: ['test', id],
    queryFn: () => testsService.get(Number(id)),
    enabled: !!id,
  });

  if (isLoading) return <Spinner label="Loading test..." />;
  if (isError || !test) return <p className="text-sm text-destructive">Test not found.</p>;

  const handleSubmit = async (data: TestWriteRequest) => {
    setIsSubmitting(true);
    try {
      await testsService.update(Number(id), data);
      navigate(`/tests/${id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TestForm
      title="Edit Test"
      initialData={test}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />
  );
}
