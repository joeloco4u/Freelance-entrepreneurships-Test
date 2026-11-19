import { X } from "lucide-react";
import type { SoftwareUpdate } from "../../types";
import SoftwareUpdatesWidget from "../layout/SoftwareUpdatesWidget";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  updates: SoftwareUpdate[];
  loading: boolean;
  onMarkAsRead: () => void;
}

export default function UpdatesModal({
  isOpen,
  onClose,
  updates,
  loading,
  onMarkAsRead,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-display font-bold text-lg text-gray-900">
            Últimas actualizaciones
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onMarkAsRead}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              Marcar leído
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="overflow-y-auto flex-1">
          <SoftwareUpdatesWidget
            updates={updates}
            loading={loading}
            unreadCount={0}
            onMarkAsRead={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
