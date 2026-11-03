import { createClient } from "@supabase/supabase-js";
import { env } from "./config/env.js";

const supabaseUrl = env.supabaseUrl;
const supabaseServiceKey = env.supabaseServiceRoleKey;

// Crear el cliente de Supabase
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
		detectSessionInUrl: false,
	},
	global: {
		headers: {
			Authorization: `Bearer ${supabaseServiceKey}`,
		},
	},
});

// CLIENTE AUTH: Solo para el middleware de validación
export const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});
