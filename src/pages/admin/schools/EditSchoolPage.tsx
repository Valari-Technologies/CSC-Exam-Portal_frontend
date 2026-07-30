import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Spinner } from '@/components/ui/Spinner';
import { schoolsService } from '@/services/schools.service';
import { SchoolForm } from './SchoolForm';

export default function EditSchoolPage() {
  const { id } = useParams<{ id: string }>();
  const schoolId = Number(id);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['school', schoolId],
    queryFn: () => schoolsService.get(schoolId),
    enabled: Number.isFinite(schoolId),
  });

  if (isLoading) return <Spinner label="Loading school…" />;
  if (isError || !data) {
    return <p className="text-sm text-destructive">Failed to load school.</p>;
  }

  return (
    <SchoolForm
      title={`Edit ${data.name}`}
      submitLabel="Save changes"
      initial={data}
      onSubmit={async (values, logo) => {
        const saved = await schoolsService.update(schoolId, values, logo);
        queryClient.invalidateQueries({ queryKey: ['schools'] });
        queryClient.invalidateQueries({ queryKey: ['school', schoolId] });
        return saved;
      }}
    />
  );
}
