import { createClient } from "@supabase/supabase-js";

// Estas variables deben estar en un archivo .env en la raíz del frontend
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
	| string
	| undefined;

if (!supabaseUrl || !supabaseAnonKey) {
	const missingKeys = [
		!supabaseUrl ? "VITE_SUPABASE_URL" : null,
		!supabaseAnonKey ? "VITE_SUPABASE_ANON_KEY" : null,
	].filter((key): key is string => key !== null);

	throw new Error(
		`Faltan las variables de entorno de Supabase en el Frontend: ${missingKeys.join(
			", ",
		)}. Revisa frontend/.env.example.`,
	);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
