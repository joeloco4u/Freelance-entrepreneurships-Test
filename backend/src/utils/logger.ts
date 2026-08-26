/**
 * Structured, normalized error logging.
 *
 * Supabase-js `PostgrestError` is a plain object, NOT an `Error` instance, so
 * `instanceof Error` silently discards every database failure. Everything here
 * shape-guards instead.
 */

export interface NormalizedError {
	message: string;
	code?: string | undefined;
	details?: string | undefined;
	hint?: string | undefined;
	stack?: string | undefined;
}

interface PostgrestLike {
	message: string;
	code?: string | undefined;
	details?: string | undefined;
	hint?: string | undefined;
}

/** Detects a Supabase/PostgREST error by shape rather than by prototype. */
export function isPostgrestError(value: unknown): value is PostgrestLike {
	if (typeof value !== "object" || value === null) return false;
	const candidate = value as Record<string, unknown>;
	if (typeof candidate.message !== "string") return false;
	return "code" in candidate || "details" in candidate || "hint" in candidate;
}

/** Turns any thrown value into a consistent shape for logging. */
export function describeError(error: unknown): NormalizedError {
	if (isPostgrestError(error)) {
		return {
			message: error.message,
			code: error.code,
			details: error.details,
			hint: error.hint,
			stack: error instanceof Error ? error.stack : undefined,
		};
	}

	if (error instanceof Error) {
		const code = (error as Error & { code?: unknown }).code;
		return {
			message: error.message,
			code: typeof code === "string" ? code : undefined,
			stack: error.stack,
		};
	}

	if (typeof error === "string") return { message: error };

	return { message: "Error desconocido", details: safeStringify(error) };
}

function safeStringify(value: unknown): string | undefined {
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

/**
 * Writes one structured line to stderr. Render captures stdout/stderr, so
 * `console` stays the transport; this only standardizes the format.
 */
export function logError(
	scope: string,
	error: unknown,
	context?: Record<string, unknown>,
): void {
	const described = describeError(error);
	console.error(
		`[${new Date().toISOString()}] [${scope}]`,
		safeStringify({ ...described, ...context }) ?? described.message,
	);
}
