import { Activity, DollarSign, Landmark, Store } from "lucide-react";
import type { SedeBreakdown } from "../../../types";
import { formatCurrency } from "../../../utils/format";
import { SectionHeader } from "./shared/SectionHeader";
import { StatCard } from "./shared/StatCard";

interface Props {
  stats: {
    totalRevenue: number;
    pendingPayroll: number;
    activeEntrepreneurs: number;
    revenueBySede: SedeBreakdown;
    pendingBySede: SedeBreakdown;
  };
}

function formatSedeBreakdown(breakdown: SedeBreakdown): string | null {
  if (breakdown.VF + breakdown.GO + breakdown.unassigned === 0) {
    return null;
  }

  const parts = [
    `VF: ${formatCurrency(breakdown.VF)}`,
    `GO: ${formatCurrency(breakdown.GO)}`,
  ];

  if (breakdown.unassigned > 0) {
    parts.push(`Sin sede: ${formatCurrency(breakdown.unassigned)}`);
  }

  return parts.join(" • ");
}

export default function AdminSection({ stats }: Props) {
  return (
    <section className="space-y-6 animate-in slide-in-from-left duration-500">
      <SectionHeader
        title="Panel Administrativo"
        icon={Landmark}
        color="text-purple-500"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Ventas Globales"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
          color="bg-emerald-500"
          description="Ingresos acumulados"
          secondary={formatSedeBreakdown(stats.revenueBySede)}
        />
        <StatCard
          label="Pendiente Liquidar"
          value={formatCurrency(stats.pendingPayroll)}
          icon={Activity}
          color="bg-amber-500"
          description="Nómina pendiente"
          secondary={formatSedeBreakdown(stats.pendingBySede)}
        />
        <StatCard
          label="Emprendimientos Activos"
          value={stats.activeEntrepreneurs}
          icon={Store}
          color="bg-indigo-500"
          description="Negocios en el sistema"
        />
      </div>
    </section>
  );
}
