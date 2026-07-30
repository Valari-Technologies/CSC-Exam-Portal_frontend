import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { teachersService } from '@/services/teachers.service';
import type { TeacherProfileDetail, TeacherWriteRequest } from '@/types';
import TeacherForm from './TeacherForm';

export default function CreateTeacherPage() {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: TeacherWriteRequest): Promise<TeacherProfileDetail> => {
    setIsSubmitting(true);
    try {
      const teacher = await teachersService.create(data);
      // Refresh the cached list so the new teacher shows when the admin navigates back
      // (staleTime is 30s). We stay on the page to show the one-time setup link.
      await queryClient.invalidateQueries({ queryKey: ['teachers'] });
      return teacher;
    } finally {
      setIsSubmitting(false);
    }
  };

  return <TeacherForm title="Add Teacher" onSubmit={handleSubmit} isSubmitting={isSubmitting} />;
}
