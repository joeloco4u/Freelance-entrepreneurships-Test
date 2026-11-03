import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";
import { z } from "zod";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ENV_PATH = resolve(HERE, "../../.env");
const DOTENV_CONFIG_PATH = process.env.DOTENV_CONFIG_PATH?.trim();
const ENV_PATH = DOTENV_CONFIG_PATH
	? resolve(DOTENV_CONFIG_PATH)
	: DEFAULT_ENV_PATH;

const loadResult = dotenv.config({
	path: ENV_PATH,
	quiet: true,
	override: false,
});

const NODE_ENV = process.env.NODE_ENV?.trim() ?? "development";

if (loadResult.error && NODE_ENV !== "production") {
	console.warn(
		`[env] No se pudo leer el archivo de entorno en ${ENV_PATH}. Se usan las variables presentes en el proceso.`,
	);
}

const emptyStringToUndefined = (value: unknown) =>
	typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(
	emptyStringToUndefined,
	z.string().optional(),
);

const httpUrl = z.url().refine(
	(value) => {
		try {
			const { protocol } = new URL(value);
			return protocol === "http:" || protocol === "https:";
		} catch {
			return false;
		}
	},
	{ message: "Debe ser una URL http o https" },
);

const envSchema = z
	.object({
		SUPABASE_URL: httpUrl,
		SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1),
		PORT: z.preprocess(
			emptyStringToUndefined,
			z.coerce.number().int().min(1).max(65535).default(3000),
		),
		APP_URL: z.preprocess(emptyStringToUndefined, httpUrl.optional()),
		CORS_ORIGIN: z.preprocess(
			emptyStringToUndefined,
			z.string().default("http://localhost:5173"),
		),
		ALLOWED_IPS: z.string().default(""),
		RESEND_API_KEY: optionalString,
		EMAIL_FROM: optionalString,
		SLACK_WEBHOOK_URL_IT: optionalString,
		SLACK_TOKEN_SHEET_URL: optionalString,
		GOOGLE_SERVICE_ACCOUNT_EMAIL: optionalString,
		GOOGLE_PRIVATE_KEY: optionalString,
	})
	.superRefine((value, ctx) => {
		if (NODE_ENV === "production" && !value.APP_URL) {
			ctx.addIssue({
				code: "custom",
				path: ["APP_URL"],
				message: "APP_URL es obligatoria en producción",
			});
		}

		if (
			value.ALLOWED_IPS.trim() !== "" &&
			parseList(value.ALLOWED_IPS).length === 0
		) {
			ctx.addIssue({
				code: "custom",
				path: ["ALLOWED_IPS"],
				message: "ALLOWED_IPS no contiene ninguna IP válida",
			});
		}
	});

function parseList(value: string): string[] {
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function formatConfigError(error: z.ZodError): string {
	const keys = [
		...new Set(error.issues.map((issue) => issue.path.map(String).join("."))),
	].filter(Boolean);

	return [
		"Configuración de entorno inválida o incompleta.",
		"",
		`Archivo esperado: ${ENV_PATH}`,
		`Claves faltantes o inválidas: ${keys.join(", ")}`,
		"",
		"Copia backend/.env.example a backend/.env y completa los valores.",
	].join("\n");
}

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	throw new Error(formatConfigError(parsed.error));
}

const raw = parsed.data;
const corsOrigins = Object.freeze(parseList(raw.CORS_ORIGIN));
const allowedIps = Object.freeze(parseList(raw.ALLOWED_IPS));
const isProduction = NODE_ENV === "production";

export interface Env {
	readonly supabaseUrl: string;
	readonly supabaseServiceRoleKey: string;
	readonly port: number;
	readonly corsOrigins: readonly string[];
	readonly allowedIps: readonly string[];
	readonly appUrl: string;
	readonly resendApiKey: string | undefined;
	readonly emailFrom: string | undefined;
	readonly slackWebhookUrlIt: string | undefined;
	readonly slackTokenSheetUrl: string | undefined;
	readonly googleServiceAccountEmail: string | undefined;
	readonly googlePrivateKey: string | undefined;
	readonly isProduction: boolean;
}

export const env: Env = Object.freeze({
	supabaseUrl: raw.SUPABASE_URL,
	supabaseServiceRoleKey: raw.SUPABASE_SERVICE_ROLE_KEY,
	port: raw.PORT,
	corsOrigins,
	allowedIps,
	appUrl: raw.APP_URL ?? corsOrigins[0] ?? "http://localhost:5173",
	resendApiKey: raw.RESEND_API_KEY,
	emailFrom: raw.EMAIL_FROM,
	slackWebhookUrlIt: raw.SLACK_WEBHOOK_URL_IT,
	slackTokenSheetUrl: raw.SLACK_TOKEN_SHEET_URL,
	googleServiceAccountEmail: raw.GOOGLE_SERVICE_ACCOUNT_EMAIL,
	googlePrivateKey: raw.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
	isProduction,
});
