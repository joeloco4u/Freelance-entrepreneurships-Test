import { useEffect, useState } from "react";
import { getPendingRequests } from "../services/authService";
import { getActiveSessions, getAllUsers } from "../services/usersService";
import { getErrorMessage } from "../utils/errorMessage";

interface ITMetrics {
  totalUsers: number;
  pendingRequests: number;
  activeSessions: number;
}

export function useITData(enabled: boolean) {
  const [metrics, setMetrics] = useState<ITMetrics>({
    totalUsers: 0,
    pendingRequests: 0,
    activeSessions: 0,
  });
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchITDashboardData = async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [users, requests, activeCount] = await Promise.all([
        getAllUsers(),
        getPendingRequests(),
        getActiveSessions(),
      ]);

      setMetrics({
        totalUsers: users.length,
        pendingRequests: requests.length,
        activeSessions: activeCount,
      });
    } catch (err: unknown) {
      const msg =
        getErrorMessage(err, "No se pudieron cargar las métricas del sistema. Verifica tu conexión e intenta de nuevo.");
      setError(msg);
      console.error("[useITData] Error:", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (cancelled) return;
        setLoading(true);
        setError(null);
        return Promise.all([getAllUsers(), getPendingRequests(), getActiveSessions()]);
      })
      .then((result) => {
        if (cancelled || !result) return;
        setMetrics({
          totalUsers: result[0].length,
          pendingRequests: result[1].length,
          activeSessions: result[2],
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          getErrorMessage(err, "No se pudieron cargar las métricas del sistema. Verifica tu conexión e intenta de nuevo.");
        setError(msg);
        console.error("[useITData] Error:", msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    ...metrics,
    loading,
    error,
    refresh: fetchITDashboardData,
  };
}
