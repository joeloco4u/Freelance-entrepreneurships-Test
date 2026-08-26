import { AppError } from "../types";
import {
  GENERIC_ERROR,
  NETWORK_ERROR,
  STATUS_MESSAGES,
} from "../constants/errorMessages";

/**
 * Patterns that mark a message as internal detail the user must never see:
 * database errors, PostgREST codes, stack frames.
 */
const INTERNAL_PATTERNS: RegExp[] = [
  /violates .*constraint/i,
  /foreign key/i,
  /duplicate key value/i,
  /relation "[^"]*" does not exist/i,
  /column "[^"]*"/i,
  /table "[^"]*"/i,
  /syntax error at/i,
  /\bPGRST\d+\b/i,
  /supabase/i,
  /postgres/i,
  /\bat .*\(.*:\d+:\d+\)/,
  /^Request failed with status code/i,
  /^Network Error$/i,
  /^timeout of /i,
];

/** True when a message looks like backend/internal detail rather than user copy. */
export function looksInternal(message: string): boolean {
  if (!message.trim()) return true;
  return INTERNAL_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Resolves any caught value into a message that is safe to show.
 * Replaces the `error instanceof Error ? error.message : "…"` idiom, which is
 * always truthy here because the axios interceptor wraps every failure in
 * `AppError extends Error` — making inline fallbacks unreachable.
 */
export function getErrorMessage(
  error: unknown,
  fallback: string = GENERIC_ERROR,
): string {
  if (error instanceof AppError) {
    if (error.message && !looksInternal(error.message)) return error.message;
    if (error.status && STATUS_MESSAGES[error.status])
      return STATUS_MESSAGES[error.status];
    return fallback;
  }

  if (error instanceof Error) {
    return looksInternal(error.message) ? fallback : error.message;
  }

  return fallback;
}

export { GENERIC_ERROR, NETWORK_ERROR };
