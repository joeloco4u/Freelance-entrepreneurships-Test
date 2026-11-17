import { Calendar, CheckCircle2, Clock, CreditCard, Filter, Minus, RotateCcw, ShoppingBag } from "lucide-react";
import { StatCard } from "../../shared/StatCard";
import { useMemo, useState } from "react";
import { useConsumerSales } from "../../../hooks/useCustomerSales";
import { formatCurrency } from "../../../utils/format";
import { MONTHS } from "../../../utils/payrollUtils";
import { DateRangeFilter } from "../../shared/DateRangeFilter";
import SearchInput from "../../shared/SearchInput";
import FilterSelector from "../../shared/FilterSelector";
import MyPurchasesDesktop from "./MyPurchasesDesktop";
import MyPurchasesEmpty from "./MyPurchasesEmpty";
import MyPurchasesMobile from "./MyPurchasesMobile";
import type { ConsumerSale } from "../../../types";

function getSaleStatus(sale: ConsumerSale) {
  if (sale.refunded || sale.sale_items.every((item) => item.refunded)) return "refunded";
  if (sale.payment_type === "immediate") {
    const allProcessed = sale.sale_items.every((item) => item.entrepreneur_processed || item.refunded);
    if (allProcessed) return "paid";
    const someProcessed = sale.sale_items.some((item) => item.entrepreneur_processed);
    if (someProcessed) return "partial";
    return "pending";
  }
  if (sale.payroll_processed) return "processed";
  return "pending";
}

export default function MyPurchases() {
  const {
    sales,
    loading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    selectedMonth,
    setSelectedMonth,
    paymentMethodFilter,
    setPaymentMethodFilter,
    dateRange,
    setDateRange,
  } = useConsumerSales();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleRow = (id: string) =>
    setExpandedId(expandedId === id ? null : id);
  const hasNoSales = !loading && sales.length === 0;

  const totalsByStatus = useMemo(() => {
    const groups: Record<string, { count: number; total: number }> = {
      pending: { count: 0, total: 0 },
      processed: { count: 0, total: 0 },
      paid: { count: 0, total: 0 },
      partial: { count: 0, total: 0 },
      refunded: { count: 0, total: 0 },
      total: { count: sales.length, total: 0 },
    };
    for (const sale of sales) {
      const status = getSaleStatus(sale);
      if (groups[status]) {
        groups[status].count += 1;
        groups[status].total += sale.total;
      }
      groups.total.total += sale.total;
    }
    return groups;
  }, [sales]);

  const statusCards = [
    { key: "pending", label: "Pendiente", icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-100", textColor: "text-amber-700" },
    { key: "processed", label: "Procesado", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-100", textColor: "text-emerald-700" },
    { key: "paid", label: "Pagado", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-100", textColor: "text-emerald-700" },
    { key: "partial", label: "Parcial", icon: Minus, color: "text-blue-600 bg-blue-50 border-blue-100", textColor: "text-blue-700" },
    { key: "refunded", label: "Reembolsado", icon: RotateCcw, color: "text-red-600 bg-red-50 border-red-100", textColor: "text-red-700" },
    { key: "total", label: "Total General", icon: ShoppingBag, color: "text-primary bg-primary/5 border-primary/20", textColor: "text-primary" },
  ];

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row gap-3 mb-4 items-center bg-white p-4 rounded-4xl md:rounded-2xl border border-gray-100 shadow-sm">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Buscar por producto o ID de la venta..."
        />

        <div className="grid grid-cols-2 lg:flex lg:flex-nowrap items-center gap-2 w-full lg:w-auto">
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

          <FilterSelector
            label={
              statusFilter === "all"
                ? "Todos"
                : statusFilter === "pending"
                  ? "Pendientes"
                  : statusFilter === "processed"
                    ? "Procesados"
                    : statusFilter === "paid"
                      ? "Pagados"
                      : statusFilter === "partial"
                        ? "Parciales"
                        : "Reembolsados"
            }
            icon={Filter}
            selectedKey={statusFilter}
            onChange={(key) => setStatusFilter(key as string)}
            items={[
              { key: "all", label: "Todos los estados" },
              { key: "pending", label: "Pendientes" },
              { key: "processed", label: "Procesados" },
              { key: "paid", label: "Pagados" },
              { key: "partial", label: "Parciales" },
              { key: "refunded", label: "Reembolsados" },
            ]}
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

          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {hasNoSales ? (
        <MyPurchasesEmpty />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {statusCards.map(({ key, label, icon, color, textColor }) => {
              const data = totalsByStatus[key];
              const total = data?.total ?? 0;
              const count = data?.count ?? 0;
              return (
                <StatCard
                  key={key}
                  icon={icon}
                  label={label}
                  value={formatCurrency(total)}
                  color={color}
                  textColor={textColor}
                  count={count}
                  countLabel={count === 1 ? "compra" : "compras"}
                />
              );
            })}
          </div>

          <div className="bg-white md:border border-gray-100 rounded-4xl md:rounded-2xl overflow-hidden md:shadow-sm">
            <MyPurchasesDesktop
              sales={sales}
              loading={loading}
              expandedId={expandedId}
              onToggle={toggleRow}
              fmt={formatCurrency}
            />
            <MyPurchasesMobile
              sales={sales}
              loading={loading}
              expandedId={expandedId}
              onToggle={toggleRow}
              fmt={formatCurrency}
            />
          </div>
        </>
      )}
    </div>
  );
}
