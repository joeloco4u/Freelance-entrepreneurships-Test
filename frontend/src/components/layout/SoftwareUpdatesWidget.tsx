import { Loader2 } from "lucide-react";
import type { SoftwareUpdate } from "../../types";
import { getCategoryIcon, getCategoryLabel } from "../../utils/softwareUpdatesUtils";

const LAST_READ_KEY = "software_updates_last_read";

interface Props {
  updates: SoftwareUpdate[];
  loading: boolean;
  unreadCount: number;
  onMarkAsRead: () => void;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "fecha desconocida";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 1) return "hace un momento";
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours} h`;
  if (diffDays < 7) return `hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
  return `hace ${diffWeeks} semana${diffWeeks > 1 ? "s" : ""}`;
}

export default function SoftwareUpdatesWidget({
  updates,
  loading
}: Props) {
  const lastReadAt = typeof window !== "undefined"
    ? localStorage.getItem(LAST_READ_KEY)
    : null;

  const isUnread = (created_at: string) => {
    if (!lastReadAt) return true;
    return new Date(created_at) > new Date(lastReadAt);
  };
  return (
    <div className="w-full">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : updates.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          No hay notificaciones nuevas
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {updates.map((update) => {
            const unread = isUnread(update.created_at);
            return (
            <div key={update.id} className={`px-4 py-3 hover:bg-gray-50 transition-colors ${unread ? "bg-blue-50/50 border-l-2 border-primary" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getCategoryIcon(update.category)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${unread ? "font-semibold" : "font-medium"} text-gray-900`}>
                      {update.title}
                    </p>
                    <span className="shrink-0 whitespace-nowrap text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {getCategoryLabel(update.category)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {update.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-400">
                      {timeAgo(update.created_at)}
                    </span>
                    {update.version && (
                      <span className="text-[10px] text-gray-400 font-mono">
                        v{update.version}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}
