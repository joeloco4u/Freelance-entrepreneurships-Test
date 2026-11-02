import { useCallback, useEffect, useMemo, useState } from "react";
import { MOCK_SOFTWARE_UPDATES } from "../config/mockData";
import { MOCK_MODE } from "../config/mockMode";
import { getCurrentMonthUpdates } from "../services/softwareUpdatesService";
import type { SoftwareUpdate } from "../types";

const LAST_READ_KEY = "software_updates_last_read";

interface UseSoftwareUpdatesReturn {
  updates: SoftwareUpdate[];
  loading: boolean;
  unreadCount: number;
  markAsRead: () => void;
}

export function useSoftwareUpdates(): UseSoftwareUpdatesReturn {
  const [updates, setUpdates] = useState<SoftwareUpdate[]>(() =>
    MOCK_MODE ? MOCK_SOFTWARE_UPDATES : [],
  );
  const [loading, setLoading] = useState(!MOCK_MODE);
  const [lastReadAt, setLastReadAt] = useState<string | null>(() =>
    localStorage.getItem(LAST_READ_KEY),
  );

  useEffect(() => {
    if (MOCK_MODE) return;

    const fetchData = async () => {
      try {
        const data = await getCurrentMonthUpdates();
        const safe = Array.isArray(data) ? data : [];
        setUpdates(safe);
      } catch (err) {
        console.error("Error fetching software updates:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const unreadCount = useMemo(() => {
    if (!lastReadAt) return updates.length;
    const lastRead = new Date(lastReadAt);
    return updates.filter((u) => new Date(u.created_at) > lastRead).length;
  }, [updates, lastReadAt]);

  const markAsRead = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem(LAST_READ_KEY, now);
    setLastReadAt(now);
  }, []);

  return { updates, loading, unreadCount, markAsRead };
}
