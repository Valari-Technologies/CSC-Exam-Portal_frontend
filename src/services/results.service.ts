import api from './api';
import type {
  PaginatedResponse,
  PublishBulkResponse,
  PublishResultResponse,
  ResultDetailResponse,
  ResultListItem,
} from '@/types';

export interface ResultListParams {
  page?: number;
  test?: number;
  assignment?: number;
  student?: number;
  subject?: number;
  school_class?: number;
  section?: number;
  date_from?: string;
  date_to?: string;
  is_published?: boolean;
  passed?: boolean;
  search?: string;
  search_type?: string;
  ordering?: string;
  class_scope?: string;
  lesson?: string;
  chapter?: number;
}

export type ExportFormat = 'csv' | 'excel' | 'pdf';

const EXTENSIONS: Record<ExportFormat, string> = {
  csv: 'csv',
  excel: 'xlsx',
  pdf: 'pdf',
};

/**
 * Hand a downloaded blob to the browser as a file.
 *
 * The object URL is revoked straight after the synthetic click: without it every
 * download would pin its blob in memory for the life of the tab, and a student
 * exporting a few formats in a row would leak all of them.
 */
function saveBlob(blob: Blob, stem: string, fileFormat: ExportFormat): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${stem}.${EXTENSIONS[fileFormat]}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const resultsService = {
  /** List results (paginated, filterable). */
  async list(params: ResultListParams = {}): Promise<PaginatedResponse<ResultListItem>> {
    const { data } = await api.get<PaginatedResponse<ResultListItem>>('/results/', { params });
    return data;
  },

  /** Get detailed result with per-question breakdown. */
  async get(id: number): Promise<ResultDetailResponse> {
    const { data } = await api.get<ResultDetailResponse>(`/results/${id}/`);
    return data;
  },

  /** Publish or unpublish a single result. */
  async publish(id: number, isPublished: boolean): Promise<PublishResultResponse> {
    const { data } = await api.post<PublishResultResponse>(`/results/${id}/publish/`, {
      is_published: isPublished,
    });
    return data;
  },

  /** Publish all results for a given assignment. */
  async publishBulk(assignmentId: number): Promise<PublishBulkResponse> {
    const { data } = await api.post<PublishBulkResponse>('/results/publish-bulk/', {
      assignment_id: assignmentId,
    });
    return data;
  },

  /** Download the filtered result list as CSV, Excel or PDF.
   *  ('file_format', not 'format' — DRF reserves 'format' for renderer negotiation.) */
  async export(fileFormat: ExportFormat, params: ResultListParams = {}): Promise<void> {
    const response = await api.get<Blob>('/results/export/', {
      params: { ...params, file_format: fileFormat },
      responseType: 'blob',
    });
    saveBlob(response.data, `results_${new Date().toISOString().slice(0, 10)}`, fileFormat);
  },

  /** Download ONE result — the score summary plus its per-question breakdown. */
  async exportOne(id: number, fileFormat: ExportFormat, filenameStem = 'result'): Promise<void> {
    const response = await api.get<Blob>(`/results/${id}/export/`, {
      params: { file_format: fileFormat },
      responseType: 'blob',
    });
    saveBlob(response.data, filenameStem, fileFormat);
  },
};
