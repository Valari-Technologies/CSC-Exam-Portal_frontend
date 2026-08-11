export interface Class {
  id: number;
  school: number;
  name: string;
  numeric_value: number;
  is_active: boolean;
  created_at: string;
  sections_count: number;
  subjects_count: number;
}

export interface Section {
  id: number;
  school: number;
  school_class: number;
  class_name: string;
  name: string;
  is_active: boolean;
  created_at: string;
  student_count: number;
}

export interface Subject {
  id: number;
  school: number;
  school_class: number;
  class_name: string;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  created_at: string;
  chapter_count: number;
  question_count: number;
}

export interface Chapter {
  id: number;
  subject: number;
  subject_name: string;
  name: string;
  order_number: number;
  description: string;
  lessons?: string[];
  is_active: boolean;
  created_at: string;
}

export interface ClassWriteRequest {
  /** Optional: the backend derives the class name from numeric_value. */
  name?: string;
  numeric_value: number;
  is_active: boolean;
  school?: number;
}

export interface SectionWriteRequest {
  school_class: number;
  name: string;
  is_active: boolean;
}

export interface SubjectWriteRequest {
  school_class: number;
  name: string;
  /** The Subject ID (`code`) is server-generated, so it is never sent on write. */
  description: string;
  is_active: boolean;
}

export interface ChapterWriteRequest {
  subject: number;
  name: string;
  /** Optional: the backend auto-assigns the next order number on create. */
  order_number?: number;
  description: string;
  lessons?: string[];
  is_active: boolean;
}
