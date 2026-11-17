import { ArrowUpDown, CreditCard, Filter, RotateCcw } from "lucide-react";
import {
  SORT_OPTIONS,
  STATUS_OPTIONS,
} from "../../../../../constants/salesFilters";
import type { DateRange } from "../../../../../types";
import type { AdminSedeFilter } from "../../../../../config/locations";
import { DateRangeFilter } from "../../../../shared/DateRangeFilter";
import FilterSelector from "../../../../shared/FilterSelector";
import SearchInput from "../../../../shared/SearchInput";
import { SedeFilter } from "../../../../shared/SedeFilter";

import type { ReactNode } from "react";

interface Props {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  paymentMethodFilter: "all" | "credit" | "efectivo" | "binance" | "pago_movil";
  onPaymentMethodChange: (val: "all" | "credit" | "efectivo" | "binance" | "pago_movil") => void;
  sortBy: string;
  onSortChange: (val: string) => void;
  dateRange: DateRange | null;
  onDateRangeChange: (val: DateRange | null) => void;
  sedeFilter: AdminSedeFilter;
  onSedeChange: (value: AdminSedeFilter) => void;
  exportButton?: ReactNode;
}

export default function SalesFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  paymentMethodFilter,
  onPaymentMethodChange,
  sortBy,
  onSortChange,
  dateRange,
  onDateRangeChange,
  sedeFilter,
  onSedeChange,
  exportButton,
}: Props) {
  const statusLabel =
    STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ??
    "Todos los estados";
  const sortLabel =
    SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Ordenar";

  const paymentLabels: Record<string, string> = {
    all: "Todos los pagos",
    credit: "Crédito",
    efectivo: "Efectivo",
    binance: "Binance",
    pago_movil: "Pago Móvil",
  };

  return (
    <div className="flex flex-col lg:flex-row gap-3 items-center bg-white p-4 rounded-4xl md:rounded-2xl border border-gray-100 shadow-sm">
      <SearchInput
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Buscar por cliente, correo o producto..."
      />

      <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
        <div className="w-full lg:w-44 min-w-0">
          <SedeFilter value={sedeFilter} onChange={onSedeChange} />
        </div>
        <div className="w-full lg:w-44 min-w-0">
          <FilterSelector
            label={statusLabel}
            icon={Filter}
            selectedKey={statusFilter}
            onChange={(key) => onStatusChange(key as string)}
            items={STATUS_OPTIONS.map((opt) => ({
              key: opt.value,
              label: opt.label,
            }))}
          />
        </div>
        <div className="w-full lg:w-44 min-w-0">
          <FilterSelector
            label={paymentLabels[paymentMethodFilter]}
            icon={CreditCard}
            selectedKey={paymentMethodFilter}
            onChange={(key) => onPaymentMethodChange(key as "all" | "credit" | "efectivo" | "binance" | "pago_movil")}
            items={[
              { key: "all", label: "Todos los pagos" },
              { key: "credit", label: "Crédito" },
              { key: "efectivo", label: "Efectivo" },
              { key: "binance", label: "Binance" },
              { key: "pago_movil", label: "Pago Móvil" },
            ]}
          />
        </div>
        <div className="w-full lg:w-44 min-w-0">
          <DateRangeFilter value={dateRange} onChange={onDateRangeChange} />
        </div>
        <div className="w-full lg:w-44 min-w-0">
          <FilterSelector
            label={sortLabel}
            icon={ArrowUpDown}
            selectedKey={sortBy}
            onChange={(key) => onSortChange(key as string)}
            items={SORT_OPTIONS.map((opt) => ({
              key: opt.value,
              label: opt.label,
            }))}
          />
        </div>
      </div>

      {exportButton}

      {(searchQuery || statusFilter !== "all" || paymentMethodFilter !== "all" || sortBy !== "date-desc" || dateRange || sedeFilter !== "ALL") && (
        <button
          type="button"
          onClick={() => {
            onSearchChange("");
            onStatusChange("all");
            onPaymentMethodChange("all");
            onSortChange("date-desc");
            onDateRangeChange(null);
            onSedeChange("ALL");
          }}
          className="p-2.5 text-gray-400 hover:text-primary rounded-xl cursor-pointer transition-colors"
          title="Limpiar filtros"
        >
          <RotateCcw size={18} />
        </button>
      )}
    </div>
  );
}
