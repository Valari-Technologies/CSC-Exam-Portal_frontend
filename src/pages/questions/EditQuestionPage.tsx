import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/Spinner';
import { questionsService } from '@/services/questions.service';
import type { QuestionWriteRequest } from '@/types';
import QuestionForm from './QuestionForm';

export default function EditQuestionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: question,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['question', id],
    queryFn: () => questionsService.get(Number(id)),
    enabled: !!id,
  });

  if (isLoading) return <Spinner label="Loading question..." />;
  if (isError || !question) return <p className="text-sm text-destructive">Question not found.</p>;

  const handleSubmit = async (data: QuestionWriteRequest) => {
    setIsSubmitting(true);
    try {
      await questionsService.update(Number(id), data);
      // Refresh the cached bank + detail so a restored (or archived) question lands in
      // the right list immediately. QueryClient staleTime is 30s, so without this the
      // Active list would keep serving its cached copy and appear not to have changed.
      await queryClient.invalidateQueries({ queryKey: ['questions'] });
      await queryClient.invalidateQueries({ queryKey: ['question'] });
      navigate('/questions');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <QuestionForm
      title="Edit Question"
      initialData={question}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />
  );
}
