import { useQueryClient } from '@tanstack/react-query';
import { schoolsService } from '@/services/schools.service';
import { SchoolForm } from './SchoolForm';

export default function CreateSchoolPage() {
  const queryClient = useQueryClient();
  return (
    <SchoolForm
      title="New School"
      submitLabel="Create school"
      onSubmit={async (values, logo) => {
        const saved = await schoolsService.create(values, logo);
        queryClient.invalidateQueries({ queryKey: ['schools'] });
        return saved;
      }}
    />
  );
}
