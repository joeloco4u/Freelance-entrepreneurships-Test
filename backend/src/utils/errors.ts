import type { Response } from "express";
import { isPostgrestError, logError } from "./logger.js";

export { isPostgrestError };

/** Generic fallback shown whenever we have no safer, more specific message. */
export const GENERIC_MESSAGE =
	"Ocurrió un error al procesar la solicitud. Intenta de nuevo más tarde.";

/**
 * An error with a message that is safe to show to the end user.
 * `cause` keeps the original failure around for logging only — it is never sent.
 */
export class AppError extends Error {
	status: number;
	publicMessage: string;
	cause?: unknown;

	constructor(publicMessage: string, status = 400, cause?: unknown) {
		super(publicMessage);
		this.name = "AppError";
		this.status = status;
		this.publicMessage = publicMessage;
		this.cause = cause;
		Object.setPrototypeOf(this, AppError.prototype);
	}
}

interface PgMapping {
	status: number;
	message: string;
}

/** Postgres / PostgREST error codes mapped to safe Spanish messages. */
export const PG_MESSAGES: Record<string, PgMapping> = {
	// foreign_key_violation
	"23503": {
		status: 409,
		message:
			"No se puede eliminar este registro porque tiene información asociada.",
	},
	// unique_violation
	"23505": {
		status: 409,
		message: "Ya existe un registro con estos datos.",
	},
	// not_null_violation
	"23502": {
		status: 400,
		message: "Faltan datos obligatorios.",
	},
	// invalid_text_representation
	"22P02": {
		status: 400,
		message: "Alguno de los datos enviados tiene un formato inválido.",
	},
	// check_violation
	"23514": {
		status: 409,
		message: "Stock insuficiente para completar la venta.",
	},
	// PostgREST: no rows returned by .single()
	PGRST116: {
		status: 404,
		message: "No se encontró el registro solicitado.",
	},
};

export interface PublicErrorOptions {
	/** Per-call-site overrides keyed by Postgres code, e.g. { "23503": "..." }. */
	messages?: Record<string, string> | undefined;
	/** Message used when the error carries no recognizable code. */
	fallback?: string | undefined;
	/** Status used alongside `fallback`. */
	status?: number | undefined;
}

export interface PublicError {
	status: number;
	message: string;
}

/**
 * Resolves any error into what the client is allowed to see.
 * Order: AppError -> per-call-site override -> PG_MESSAGES -> fallback -> generic.
 */
export function toPublicError(
	error: unknown,
	options: PublicErrorOptions = {},
): PublicError {
	if (error instanceof AppError) {
		return { status: error.status, message: error.publicMessage };
	}

	if (isPostgrestError(error) && error.code) {
		const override = options.messages?.[error.code];
		if (override) {
			return {
				status: PG_MESSAGES[error.code]?.status ?? 400,
				message: override,
			};
		}

		const mapped = PG_MESSAGES[error.code];
		if (mapped) return mapped;
	}

	return {
		status: options.status ?? 500,
		message: options.fallback ?? GENERIC_MESSAGE,
	};
}

/**
 * The single helper controllers use: logs the full error server-side, then
 * responds with a safe message. Response shape stays `{ error: string }`.
 */
export function respondWithError(
	res: Response,
	error: unknown,
	scope: string,
	options: PublicErrorOptions = {},
): Response {
	logError(scope, error);
	const { status, message } = toPublicError(error, options);
	return res.status(status).json({ error: message });
}
