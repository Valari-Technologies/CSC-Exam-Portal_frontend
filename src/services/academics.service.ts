import api from './api';
import type {
  Chapter,
  ChapterWriteRequest,
  Class,
  ClassWriteRequest,
  PaginatedResponse,
  Section,
  SectionWriteRequest,
  Subject,
  SubjectWriteRequest,
} from '@/types';

interface ListParams {
  page?: number;
  search?: string;
  ordering?: string;
  is_active?: boolean;
  school_class?: number;
  subject?: number;
  school?: number;
  page_size?: number;
}

function makeCrud<TList, TWrite>(resource: string) {
  return {
    async list(params: ListParams = {}): Promise<PaginatedResponse<TList>> {
      const { data } = await api.get<PaginatedResponse<TList>>(`/${resource}/`, { params });
      return data;
    },
    async get(id: number): Promise<TList> {
      const { data } = await api.get<TList>(`/${resource}/${id}/`);
      return data;
    },
    async create(payload: TWrite): Promise<TList> {
      const { data } = await api.post<TList>(`/${resource}/`, payload);
      return data;
    },
    async update(id: number, payload: TWrite): Promise<TList> {
      const { data } = await api.put<TList>(`/${resource}/${id}/`, payload);
      return data;
    },
    async patch(id: number, payload: Partial<TWrite>): Promise<TList> {
      const { data } = await api.patch<TList>(`/${resource}/${id}/`, payload);
      return data;
    },
    async remove(id: number): Promise<void> {
      await api.delete(`/${resource}/${id}/`);
    },
  };
}

export const classesService = makeCrud<Class, ClassWriteRequest>('classes');
export const sectionsService = makeCrud<Section, SectionWriteRequest>('sections');
export const subjectsService = makeCrud<Subject, SubjectWriteRequest>('subjects');
export const chaptersService = makeCrud<Chapter, ChapterWriteRequest>('chapters');
