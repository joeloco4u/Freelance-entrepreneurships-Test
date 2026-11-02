import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { MOCK_AUTH_USER, MOCK_ROLES } from "../../../../config/mockData";
import { MOCK_MODE } from "../../../../config/mockMode";
import { supabase } from "../../../../config/supabaseClient";
import type { UserRole } from "../../../../types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(() =>
    MOCK_MODE ? MOCK_AUTH_USER : null,
  );
  const [loading, setLoading] = useState(!MOCK_MODE);

  useEffect(() => {
    if (MOCK_MODE) return;

    let mounted = true;

    // 1. Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    // 2. Escuchar cambios (Login, Logout, Token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Cierra la sesión en Supabase.
   * El estado del usuario se actualizará automáticamente
   * gracias al listener onAuthStateChange.
   */
  const logout = async () => {
    if (MOCK_MODE) {
      setUser(null);
      // Mock auth re-seeds on reload; navigate away so the logout is visible.
      window.location.assign("/login");
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const getRoles = (): UserRole[] => {
    if (MOCK_MODE) return user ? [...MOCK_ROLES] : [];
    if (!user) return [];
    const metadata = user.user_metadata || {};
    const rawRoles = metadata.role || metadata.roles || [];
    return (Array.isArray(rawRoles) ? rawRoles : [rawRoles]) as UserRole[];
  };

  return {
    user,
    loading,
    logout, // <-- Nueva función expuesta
    roles: getRoles(),
    isAuthenticated: !!user,
    hasRole: (validRoles: UserRole[]) =>
      getRoles().some((r) => validRoles.includes(r)),
  };
}
