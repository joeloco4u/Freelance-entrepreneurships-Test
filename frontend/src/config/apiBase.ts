const API_PREFIX = "/api"; // backend mounts every router under /api (backend/src/index.ts)

export function resolveApiBaseUrl(raw: string | undefined): string {
	const trimmed = (raw ?? "").trim();

	if (trimmed.startsWith("//")) {
		throw new Error(
			"VITE_API_URL no puede ser una URL protocol-relative (//host). Usa una URL absoluta con http(s):// o déjala vacía en desarrollo. Revisa frontend/.env.example.",
		);
	}

	const origin = trimmed.replace(/\/+$/, "").replace(/\/api$/i, "");

	if (import.meta.env.PROD && !/^https?:\/\//i.test(origin)) {
		throw new Error(
			"VITE_API_URL debe ser la URL absoluta del backend en producción (por ejemplo, https://api.tudominio.com). Vercel no tiene proxy /api: una URL relativa devolvería index.html con HTTP 200 y rompería el catálogo. Revisa frontend/.env.example.",
		);
	}

	return `${origin}${API_PREFIX}`;
}
