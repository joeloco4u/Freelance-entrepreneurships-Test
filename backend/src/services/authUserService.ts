import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "../db.js";

// The GoTrue admin API exposes no filter-by-email endpoint, so the only way to
// resolve an email is to page through the user list and match it ourselves.
const PAGE_SIZE = 1000;
const MAX_PAGES = 10;

/**
 * Looks up a user in Supabase Auth by email address.
 *
 * Returns null when no account exists. Throws when the Auth API fails, so the
 * caller can decide how to behave on an outage instead of silently treating the
 * failure as "no account".
 */
export async function findAuthUserByEmail(email: string): Promise<User | null> {
	const normalizedEmail = email.toLowerCase().trim();

	for (let page = 1; page <= MAX_PAGES; page++) {
		const { data, error } = await supabaseAdmin.auth.admin.listUsers({
			page,
			perPage: PAGE_SIZE,
		});

		if (error) throw new Error(error.message);

		const users = data?.users ?? [];

		for (const user of users) {
			if (user.email?.toLowerCase() === normalizedEmail) return user;
		}

		// A short page means we already reached the end of the list.
		if (users.length < PAGE_SIZE) return null;
	}

	console.warn(
		`[AuthUserService] Se alcanzó el límite de ${MAX_PAGES} páginas buscando ${normalizedEmail}`,
	);
	return null;
}
