import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Ordinal for a class number: 1 -> "1st", 11 -> "11th", etc. */
export function ordinalLabel(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th';
  return `${n}${suffix}`;
}

/** The platform supports Grades 1-10 only; mirrors MIN_GRADE/MAX_GRADE in academics/models.py. */
export const MIN_GRADE = 1;
export const MAX_GRADE = 10;

/**
 * Canonical display label for a class — just the number, e.g. "1".."10".
 * Falls back to the raw name for out-of-range classes (e.g. "LKG", "Nursery").
 */
export function classLabel(c: { numeric_value: number; name: string }): string {
  if (c.numeric_value >= MIN_GRADE && c.numeric_value <= MAX_GRADE) {
    return `${c.numeric_value}`;
  }
  return c.name;
}
