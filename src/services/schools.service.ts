import api from './api';
import type {
  PaginatedResponse,
  PlatformStats,
  School,
  SchoolAdmin,
  SchoolAdminWriteRequest,
  SchoolCreateRequest,
  SchoolListItem,
  SchoolStats,
  SchoolWriteRequest,
} from '@/types';

export interface SchoolListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  ordering?: string;
}

/**
 * Build a multipart payload that carries the school fields plus the logo file.
 * Used whenever a logo File is selected — Django needs multipart/form-data to
 * receive the upload alongside the text fields.
 */
function toFormData(payload: Partial<SchoolCreateRequest>, logo: File): FormData {
  const form = new FormData();
  (Object.entries(payload) as [string, string | undefined][]).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.append(key, String(value));
    }
  });
  form.append('logo', logo);
  return form;
}

// Override the instance-default JSON content type. Setting 'multipart/form-data'
// (without a boundary) tells axios to generate the boundary itself for the upload.
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

export const schoolsService = {
  async list(params: SchoolListParams = {}): Promise<PaginatedResponse<SchoolListItem>> {
    const { data } = await api.get<PaginatedResponse<SchoolListItem>>('/schools/', { params });
    return data;
  },

  async get(id: number): Promise<School> {
    const { data } = await api.get<School>(`/schools/${id}/`);
    return data;
  },

  /** Creates the school AND its first School Admin in one transactional request. */
  async create(payload: SchoolCreateRequest, logo?: File | null): Promise<School> {
    const { data } = logo
      ? await api.post<School>('/schools/', toFormData(payload, logo), MULTIPART)
      : await api.post<School>('/schools/', payload);
    return data;
  },

  /** The school's School Admin account(s) — their LOGIN emails, not the school's. */
  async admins(schoolId: number): Promise<SchoolAdmin[]> {
    const { data } = await api.get<SchoolAdmin[]>(`/schools/${schoolId}/admins/`);
    return data;
  },

  /**
   * Update a School Admin's account (name, login email, password, active flag).
   * Separate from update() on purpose: editing school details must never change
   * who can log in.
   */
  async updateAdmin(
    schoolId: number,
    adminId: number,
    payload: SchoolAdminWriteRequest,
  ): Promise<SchoolAdmin> {
    const { data } = await api.patch<SchoolAdmin>(
      `/schools/${schoolId}/admins/${adminId}/`,
      payload,
    );
    return data;
  },

  async update(id: number, payload: SchoolWriteRequest, logo?: File | null): Promise<School> {
    const { data } = logo
      ? await api.put<School>(`/schools/${id}/`, toFormData(payload, logo), MULTIPART)
      : await api.put<School>(`/schools/${id}/`, payload);
    return data;
  },

  async patch(id: number, payload: Partial<SchoolWriteRequest>, logo?: File | null): Promise<School> {
    const { data } = logo
      ? await api.patch<School>(`/schools/${id}/`, toFormData(payload, logo), MULTIPART)
      : await api.patch<School>(`/schools/${id}/`, payload);
    return data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/schools/${id}/`);
  },

  async stats(id: number): Promise<SchoolStats> {
    const { data } = await api.get<SchoolStats>(`/schools/${id}/stats/`);
    return data;
  },

  async platformStats(): Promise<PlatformStats> {
    const { data } = await api.get<PlatformStats>('/schools/platform-stats/');
    return data;
  },
};
