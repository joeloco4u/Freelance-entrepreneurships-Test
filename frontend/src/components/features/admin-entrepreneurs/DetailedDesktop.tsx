import { Dropdown, type MenuProps } from "antd";
import { ArrowDown, ArrowUp, CheckCircle2, MoreVertical, RotateCcw, User } from "lucide-react";
import type { AdminSedeFilter } from "../../../config/locations";
import { SedeBadge } from "../../shared/SedeBadge";
import { SedeColumnFilter } from "../../shared/SedeColumnFilter";
import type { GlobalSale, SaleItemDetail } from "../../../types";
import { formatCurrency } from "../../../utils/format";
import StatusBadge, { PaymentTypeLabel } from "../my-purchases/shared/StatusBadge";

interface Props {
  sales: GlobalSale[];
  selectedSales: string[];
  toggleSelection: (id: string) => void;
  toggleAll: () => void;
  onProcessSingle: (id: string) => void;
  onRefund: (sale: GlobalSale) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (order: "asc" | "desc") => void;
  processingIds: string[];
  selectedEntId?: string | null;
  sedeFilter: AdminSedeFilter;
  onSedeFilterChange: (value: AdminSedeFilter) => void;
  hasLocationData: boolean;
}

export const DetailedDesktop = (props: Props) => {
  const {
    sales,
    selectedSales,
    toggleSelection,
    toggleAll,
    onProcessSingle,
    onRefund,
    sortOrder,
    setSortOrder,
    processingIds,
    selectedEntId,
    sedeFilter,
    onSedeFilterChange,
    hasLocationData,
  } = props;

  const getActionMenu = (sale: GlobalSale): MenuProps => {
    const allRefunded = sale.sale_items.every((item) => item.refunded);
    const isEffectivelyRefunded = sale.refunded || allRefunded;
    const items: MenuProps["items"] = [];

    if (sale.payment_type !== "immediate" && !sale.payroll_processed && !isEffectivelyRefunded) {
      items.push({
        key: "liquidate",
        icon: <CheckCircle2 size={14} />,
        label: "Liquidar",
        onClick: () => onProcessSingle(sale.id),
      });
    }

    if (!sale.payroll_processed && !isEffectivelyRefunded) {
      items.push({
        key: "refund",
        icon: <RotateCcw size={14} />,
        label: "Reembolsar",
        onClick: () => onRefund(sale),
      });
    }

    return { items };
  };

  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-100">
            <th className="px-6 py-4 w-10">
              <input
                type="checkbox"
                onChange={toggleAll}
                className="rounded text-primary cursor-pointer"
              />
            </th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">
              Cliente
            </th>
            {hasLocationData && (
              <th scope="col" className="px-6 py-4">
                <SedeColumnFilter
                  value={sedeFilter}
                  onChange={onSedeFilterChange}
                />
              </th>
            )}
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">
              Productos
            </th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">
              Pago
            </th>
            <th
              className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase cursor-pointer group"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              <div className="flex items-center gap-1 group-hover:text-primary transition-colors">
                Fecha{" "}
                {sortOrder === "asc" ? (
                  <ArrowUp size={12} />
                ) : (
                  <ArrowDown size={12} />
                )}
              </div>
            </th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase text-center">
              Estado
            </th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase text-right">
              Monto
            </th>
            <th className="px-6 py-4 w-12"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sales.map((sale) => {
            const visibleItems = sale.sale_items.filter(
              (item: SaleItemDetail) => !selectedEntId || item.products.entrepreneurships.id === selectedEntId,
            );
            const allVisibleItemsRefunded = visibleItems.every((item: SaleItemDetail) => item.refunded);
            const isEffectivelyRefunded = sale.refunded || allVisibleItemsRefunded;
            const visibleItemsTotal = visibleItems.reduce((sum: number, item: SaleItemDetail) => sum + Number(item.subtotal), 0);
            const isImmediate = sale.payment_type === "immediate";
            const canLiquidate = !isImmediate && !sale.payroll_processed && !isEffectivelyRefunded;
            const canRefund = !sale.payroll_processed && !isEffectivelyRefunded;
            const showActions = canLiquidate || canRefund;
            const menu = getActionMenu(sale);
            return (
            <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4">
                <input
                  type="checkbox"
                  disabled={
                    sale.payroll_processed || isEffectivelyRefunded || processingIds.includes(sale.id) || isImmediate
                  }
                  checked={selectedSales.includes(sale.id)}
                  onChange={() => toggleSelection(sale.id)}
                  className="rounded text-primary cursor-pointer disabled:opacity-30"
                />
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                    <User size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {sale.users.name}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {sale.users.email}
                    </p>
                    {sale.note && (
                      <p className="text-[10px] text-gray-500 italic mt-0.5">"{sale.note}"</p>
                    )}
                  </div>
                </div>
              </td>
              {hasLocationData && (
                <td className="px-6 py-4">
                  <SedeBadge
                    codes={sale.location_id ? [sale.location_id] : []}
                  />
                </td>
              )}
              <td className="px-6 py-4">
                {sale.sale_items
                  .filter((item: SaleItemDetail) => !selectedEntId || item.products.entrepreneurships.id === selectedEntId)
                  .map((item: SaleItemDetail) => (
                  <p
                    key={item.products.id}
                    className={`text-[11px] ${item.refunded ? 'text-red-400' : 'text-gray-600'}`}
                  >
                    <b className={item.refunded ? 'text-red-400' : 'text-primary'}>{item.quantity}x</b>{" "}
                    <span className={item.refunded ? 'line-through' : ''}>{item.products.name}</span>
                    {item.refunded && (
                      <span className="text-[8px] font-bold text-red-500 bg-red-100 px-1 py-0.5 rounded ml-1">REEMBOLSADO</span>
                    )}
                  </p>
                ))}
              </td>
              <td className="px-6 py-4">
                <PaymentTypeLabel paymentType={sale.payment_type} paymentMethod={sale.payment_method} />
              </td>
              <td className="px-6 py-4 text-xs text-gray-500">
                {new Date(sale.created_at).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 text-center">
                <StatusBadge
                  processed={sale.payroll_processed}
                  refunded={sale.refunded}
                  paymentType={sale.payment_type}
                  saleItems={sale.sale_items}
                />
              </td>
              <td className="px-6 py-4 text-right font-bold text-gray-900">
                {formatCurrency(visibleItemsTotal)}
              </td>
              <td className="px-6 py-4 text-right">
                {showActions ? (
                  <Dropdown menu={menu} trigger={["click"]} placement="bottomRight">
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-300 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </Dropdown>
                ) : (
                  <span className="text-gray-200 p-1.5 block">
                    <MoreVertical size={16} className="opacity-30" />
                  </span>
                )}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};