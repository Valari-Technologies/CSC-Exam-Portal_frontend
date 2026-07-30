import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionsService } from '@/services/questions.service';
import type { QuestionWriteRequest } from '@/types';
import QuestionForm from './QuestionForm';

export default function CreateQuestionPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: QuestionWriteRequest) => {
    setIsSubmitting(true);
    try {
      await questionsService.create(data);
      navigate('/questions');
    } finally {
      setIsSubmitting(false);
    }
  };

  return <QuestionForm title="New Question" onSubmit={handleSubmit} isSubmitting={isSubmitting} />;
}
