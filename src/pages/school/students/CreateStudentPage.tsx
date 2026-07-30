import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { studentsService } from '@/services/students.service';
import type { StudentProfileDetail, StudentWriteRequest } from '@/types';
import StudentCredentialsPanel from './StudentCredentialsPanel';
import StudentForm from './StudentForm';

export default function CreateStudentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState<StudentProfileDetail | null>(null);

  const handleSubmit = async (data: StudentWriteRequest) => {
    setIsSubmitting(true);
    try {
      const student = await studentsService.create(data);
      await queryClient.invalidateQueries({ queryKey: ['students'] });
      // Hold here instead of navigating away: the password is returned exactly once
      // and is unrecoverable after this screen.
      setCreated(student);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (created) {
    return (
      <StudentCredentialsPanel
        student={created}
        mode="created"
        onDone={() => navigate('/school/students')}
      />
    );
  }

  return <StudentForm title="Add Student" onSubmit={handleSubmit} isSubmitting={isSubmitting} />;
}
