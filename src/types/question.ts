export type Difficulty = 'easy' | 'medium' | 'hard';
export type OptionKey = 'a' | 'b' | 'c' | 'd';

/** Nested {id, name} used in list serializer for subject / chapter. */
export interface NamedRef {
  id: number;
  name: string;
}

/** Compact list representation returned by the list endpoint. */
export interface QuestionListItem {
  id: number;
  school: number;
  subject: NamedRef;
  chapter: NamedRef;
  lesson?: string;
  question_text: string;
  difficulty: Difficulty;
  marks: string;
  correct_option: OptionKey;
  is_active: boolean;
  created_at: string;
}

/** Full detail representation returned by the retrieve endpoint. */
export interface Question {
  id: number;
  school: number;
  subject: number;
  subject_name: string;
  chapter: number;
  chapter_name: string;
  lesson?: string;
  created_by: number | null;
  created_by_name: string | null;
  question_text: string;
  question_image: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_a_image: string | null;
  option_b_image: string | null;
  option_c_image: string | null;
  option_d_image: string | null;
  correct_option: OptionKey;
  explanation: string;
  difficulty: Difficulty;
  marks: string;
  negative_marks: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Payload for creating / updating a question. */
export interface QuestionWriteRequest {
  subject: number;
  chapter: number;
  lesson?: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: OptionKey;
  explanation?: string;
  difficulty: Difficulty;
  marks: number;
  negative_marks: number;
  is_active: boolean;
  school?: number;
}
