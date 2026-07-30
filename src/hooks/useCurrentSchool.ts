import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { schoolsService } from '@/services/schools.service';
import type { School } from '@/types';

/**
 * Fetch the school the logged-in user belongs to (school_admin, teacher,
 * student). CSC Admin has no single school (user.school === null), so the
 * query is disabled for them and the caller falls back to the platform brand.
 */
export function useCurrentSchool() {
  const { user } = useAuth();
  const schoolId = user?.school ?? null;

  return useQuery<School>({
    queryKey: ['school', schoolId],
    queryFn: () => schoolsService.get(schoolId as number),
    enabled: schoolId !== null,
    staleTime: 5 * 60 * 1000,
  });
}
