import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  description: string;
  secondary?: ReactNode;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color,
  description,
  secondary,
}: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div
          className={`${color} p-3 rounded-2xl text-white shadow-lg shadow-current/20`}
        >
          <Icon size={24} />
        </div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-2 py-1 rounded-md">
          En tiempo real
        </span>
      </div>
      <div className="space-y-1">
        <h3 className="text-gray-500 text-sm font-medium">{label}</h3>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 font-medium pt-1">{description}</p>
        {secondary ? (
          <p className="text-[11px] text-gray-400 font-medium tabular-nums pt-0.5 leading-tight">
            {secondary}
          </p>
        ) : null}
      </div>
    </div>
  );
}
