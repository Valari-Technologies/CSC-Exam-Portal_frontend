import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { testsService } from '@/services/tests.service';
import type { TestWriteRequest } from '@/types';
import TestForm from './TestForm';

export default function CreateTestPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: TestWriteRequest) => {
    setIsSubmitting(true);
    try {
      const created = await testsService.create(data);
      navigate(`/tests/${created.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return <TestForm title="Create Test" onSubmit={handleSubmit} isSubmitting={isSubmitting} />;
}
