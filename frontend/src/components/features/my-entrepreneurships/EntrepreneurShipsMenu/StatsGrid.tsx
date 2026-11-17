import { CircleCheck, Clock, DollarSign } from "lucide-react";
import { StatCard } from "../../dashboard/shared/StatCard";
import type { SedeBreakdown } from "../../../../types";
import {
  formatCurrency,
  formatSedeBreakdown,
} from "../../../../utils/format";

interface Props {
  revenue: number;
  pendingPayrollTotal: number;
  processedPayrollTotal: number;
  revenueBySede: SedeBreakdown;
  pendingBySede: SedeBreakdown;
}

export default function StatsGrid({
  revenue,
  pendingPayrollTotal,
  processedPayrollTotal,
  revenueBySede,
  pendingBySede,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard
        label="Ingresos Totales"
        value={formatCurrency(revenue)}
        icon={DollarSign}
        color="bg-emerald-500"
        description="Suma de todas las ventas"
        secondary={formatSedeBreakdown(revenueBySede)}
      />
      <StatCard
        label="Pendiente de Nómina"
        value={formatCurrency(pendingPayrollTotal)}
        icon={Clock}
        color="bg-blue-500"
        description="Total por liquidar"
        secondary={formatSedeBreakdown(pendingBySede)}
      />
      <StatCard
        label="Ventas Procesadas"
        value={formatCurrency(processedPayrollTotal)}
        icon={CircleCheck}
        color="bg-purple-500"
        description="Total liquidadas en nómina"
      />
    </div>
  );
}
