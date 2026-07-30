/**
 * The supported section range, A-F.
 *
 * Mirrors SECTION_NAMES in the backend's `apps/academics/services.py`, which is what
 * `seed_class_sections` creates. Narrowed from A-H on 2026-07-16 — G and H were removed
 * by migration `academics/0004_narrow_sections_to_a_f`.
 *
 * Kept in one place on purpose: this list previously existed as a private copy inside
 * SectionManagementPage and drifted out of step with the backend when the range changed.
 * Anything offering sections as a fixed choice should import it from here.
 */
export const SECTION_NAMES = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

export type SectionName = (typeof SECTION_NAMES)[number];

/**
 * True for a section within the supported range, ignoring case.
 *
 * Nothing stops the API storing a name outside it — the Section model allows any 10-char
 * string, and older data used forms like "A(a)". Use this to keep such a row out of a
 * picker without pretending it cannot exist.
 */
export function isStandardSection(name: string): boolean {
  return (SECTION_NAMES as readonly string[]).includes(name.trim().toUpperCase());
}
