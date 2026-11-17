import { Calendar, CreditCard, Filter, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import type { DateRange } from "../../../types";
import { MONTHS } from "../../../utils/payrollUtils";
import { DateRangeFilter } from "../../shared/DateRangeFilter";
import FilterSelector from "../../shared/FilterSelector";
import SearchInput from "../../shared/SearchInput";

interface Props {
  view: "summary" | "detailed";
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  paymentMethodFilter: "all" | "credit" | "efectivo" | "binance" | "pago_movil";
  setPaymentMethodFilter: (val: "all" | "credit" | "efectivo" | "binance" | "pago_movil") => void;
  selectedMonth: number | null;
  setSelectedMonth: (val: number | null) => void;
  dateRange: DateRange | null;
  setDateRange: (val: DateRange | null) => void;
  exportButton?: ReactNode;
}

export const ConsumersFilters = ({
  view,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  paymentMethodFilter,
  setPaymentMethodFilter,
  selectedMonth,
  setSelectedMonth,
  dateRange,
  setDateRange,
  exportButton,
}: Props) => (
  <div className="flex flex-col lg:flex-row gap-3 items-center bg-white p-4 rounded-4xl md:rounded-2xl border border-gray-100 shadow-sm">
    <SearchInput
      value={searchQuery}
      onChange={setSearchQuery}
      placeholder={
        view === "summary"
          ? "Buscar por nombre o correo..."
          : "Buscar por producto o ID..."
      }
    />

    {view === "detailed" && (
      <div className="grid grid-cols-2 lg:flex lg:flex-nowrap items-center gap-2 w-full lg:w-auto">
          <FilterSelector
            label={
              statusFilter === "all"
                ? "Todos"
                : statusFilter === "pending"
                  ? "Pendientes"
                  : statusFilter === "paid"
                    ? "Pago Realizado"
                    : statusFilter === "refunded"
                      ? "Reembolsadas"
                      : "Procesados"
            }
            icon={Filter}
            items={[
              { key: "all", label: "Todos los estados" },
              { key: "pending", label: "Pendientes" },
              { key: "paid", label: "Pago Realizado" },
              { key: "processed", label: "Procesados" },
              { key: "refunded", label: "Reembolsadas" },
            ]}
            selectedKey={statusFilter}
            onChange={(key) => setStatusFilter(key as string)}
          />

        <FilterSelector
            label={
              paymentMethodFilter === "all"
                ? "Todos los pagos"
                : paymentMethodFilter === "credit"
                  ? "Crédito"
                  : paymentMethodFilter === "efectivo"
                    ? "Efectivo"
                    : paymentMethodFilter === "binance"
                      ? "Binance"
                      : "Pago Móvil"
            }
            icon={CreditCard}
            selectedKey={paymentMethodFilter}
            onChange={(key) => setPaymentMethodFilter(key as "all" | "credit" | "efectivo" | "binance" | "pago_movil")}
            items={[
              { key: "all", label: "Todos los pagos" },
              { key: "credit", label: "Crédito" },
              { key: "efectivo", label: "Efectivo" },
              { key: "binance", label: "Binance" },
              { key: "pago_movil", label: "Pago Móvil" },
            ]}
          />

          <FilterSelector
            label={selectedMonth !== null ? MONTHS[selectedMonth] : "Meses"}
            icon={Calendar}
            selectedKey={selectedMonth ?? "all"}
            onChange={(key) => setSelectedMonth(key === "all" ? null : (key as number))}
            items={[
              { key: "all", label: "Todos los meses" },
              ...MONTHS.map((m, i) => ({ key: i, label: m })),
            ]}
          />

        <DateRangeFilter value={dateRange} onChange={setDateRange} />

        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            setStatusFilter("all");
            setPaymentMethodFilter("all");
            setDateRange(null);
            setSelectedMonth(null);
          }}
          className="p-2.5 text-gray-400 hover:text-primary rounded-xl cursor-pointer transition-colors"
          title="Limpiar filtros"
        >
          <RotateCcw size={18} />
        </button>
      </div>
    )}

    {exportButton}
  </div>
);
