import { createClient } from "@supabase/supabase-js";
import {
	MOCK_MODE,
	MOCK_SUPABASE_ANON_KEY,
	MOCK_SUPABASE_URL,
} from "./mockMode";

// Estas variables deben estar en un archivo .env en la raíz del frontend
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
	| string
	| undefined;

// Mock mode never uses real credentials, so a real session is never touched.
const url = MOCK_MODE ? MOCK_SUPABASE_URL : supabaseUrl;
const key = MOCK_MODE ? MOCK_SUPABASE_ANON_KEY : supabaseAnonKey;

if (!url || !key) {
	throw new Error("Faltan las variables de entorno de Supabase en el Frontend");
}

export const supabase = createClient(url, key);
