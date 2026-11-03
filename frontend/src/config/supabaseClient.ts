import { createClient } from "@supabase/supabase-js";

// Estas variables deben estar en un archivo .env en la raíz del frontend
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
	| string
	| undefined;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error("Faltan las variables de entorno de Supabase en el Frontend");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
