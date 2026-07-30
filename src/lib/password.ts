import { AxiosError } from 'axios';
import { z } from 'zod';

/**
 * Client-side mirror of the backend password policy.
 *
 * Must stay in step with PASSWORD_MIN_LENGTH in backend/config/settings/base.py (which
 * feeds MinimumLengthValidator and every serializer) and PasswordComplexityValidator in
 * backend/apps/authentication/validators.py. When these drift, the form accepts a
 * password the API then rejects, and the user is told something unhelpful.
 */
export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_RULES_HINT =
  'At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character.';

const SPECIAL_CHARS_RE = /[!@#$%^&*()_+\-=[\]{};:,.<>?/\\|`~"']/;

export const passwordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
  .regex(/\d/, 'Password must contain at least one number.')
  .regex(
    SPECIAL_CHARS_RE,
    'Password must contain at least one special character (e.g. ! @ # $ %).',
  );

/**
 * Same policy, but blank is allowed — for the "leave blank to keep the current password"
 * fields (editing a student, resetting a School Admin's password). An empty string means
 * "don't change it"; anything typed must satisfy the full policy.
 */
export const optionalPasswordField = z
  .union([z.literal(''), passwordField])
  .optional();

/**
 * Check a password against the policy outside of zod, for forms that aren't built on
 * react-hook-form. Returns the first problem, or null when the password is acceptable.
 */
export function validatePasswordValue(password: string): string | null {
  const result = passwordField.safeParse(password);
  return result.success ? null : result.error.issues[0].message;
}

/* ---------- generation ---------- */

// Mirrors backend apps/students/services.py::generate_student_password exactly: the
// generated shape is 1 uppercase + 1 digit + 1 special + the rest lowercase, which at
// PASSWORD_MIN_LENGTH (8) is 1/5/1/1. Ambiguous glyphs (0/O, 1/l/I) are excluded — these
// credentials get printed and read off paper by children, and a misread is a support call.
const PW_UPPER = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const PW_LOWER = 'abcdefghijkmnpqrstuvwxyz';
const PW_DIGITS = '23456789';
const PW_SPECIAL = '!@#$%^&*';

function pick(chars: string): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return chars[buf[0] % chars.length];
}

/**
 * A random password with exactly the policy's composition, so a generated password always
 * passes both this file's validation and the server's.
 */
export function generatePassword(length: number = PASSWORD_MIN_LENGTH): string {
  const chars = [pick(PW_UPPER), pick(PW_DIGITS), pick(PW_SPECIAL)];
  while (chars.length < length) chars.push(pick(PW_LOWER));

  for (let i = chars.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const j = buf[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/**
 * Pull a human-readable message out of a DRF error response.
 *
 * DRF answers a failed password change with field errors — {"new_password": ["..."]} or
 * {"old_password": ["..."]} — not {"detail": "..."}. Reading only `detail` drops the one
 * piece of information the user needs and leaves a generic message in its place, which
 * is what made "change password" look broken rather than merely rejected.
 */
export function extractApiError(err: unknown, fallback: string): string {
  if (!(err instanceof AxiosError) || !err.response?.data) return fallback;

  const data = err.response.data as unknown;
  if (typeof data === 'string') return data;
  if (typeof data !== 'object' || data === null) return fallback;

  const record = data as Record<string, unknown>;

  // Prefer field errors (that's where the real reason lives), then detail.
  const messages: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (key === 'detail') continue;
    if (typeof value === 'string') messages.push(value);
    else if (Array.isArray(value)) messages.push(...value.map(String));
  }
  if (messages.length > 0) return messages.join(' ');

  if (typeof record.detail === 'string') return record.detail;
  if (Array.isArray(record.detail)) return record.detail.map(String).join(' ');

  return fallback;
}
