import { Dropdown, type MenuProps } from "antd";
import { CheckCircle2, MoreVertical, RotateCcw } from "lucide-react";
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
  processingIds: string[];
  sedeFilter: AdminSedeFilter;
  onSedeFilterChange: (value: AdminSedeFilter) => void;
  hasLocationData: boolean;
}

export const ConsumerDetailedDesktop = ({
  sales,
  selectedSales,
  toggleSelection,
  toggleAll,
  onProcessSingle,
  onRefund,
  processingIds,
  sedeFilter,
  onSedeFilterChange,
  hasLocationData,
}: Props) => {
  const getActionMenu = (sale: GlobalSale): MenuProps => {
    const allRefunded = sale.sale_items.every((item) => item.refunded);
    const isEffectivelyRefunded = sale.refunded || allRefunded;
    const items: MenuProps["items"] = [];

    if (sale.payment_type !== "immediate" && !sale.payroll_processed && !isEffectivelyRefunded) {
      items.push({
        key: "discount",
        icon: <CheckCircle2 size={14} />,
        label: "Descontar",
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

  const refundableCount = sales.filter(
    (s) => s.payment_type !== "immediate" && !s.payroll_processed && !s.refunded
  ).length;

  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-100">
            <th className="px-6 py-4 w-10">
              <input
                type="checkbox"
                onChange={toggleAll}
                checked={refundableCount > 0 && selectedSales.length === refundableCount}
                className="rounded border-gray-300 text-primary cursor-pointer"
              />
            </th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Productos
            </th>
            {hasLocationData && (
              <th scope="col" className="px-6 py-4">
                <SedeColumnFilter
                  value={sedeFilter}
                  onChange={onSedeFilterChange}
                />
              </th>
            )}
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Pago
            </th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Fecha
            </th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">
              Estado
            </th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">
              Monto
            </th>
            <th className="px-6 py-4 w-12"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sales.map((sale) => {
            const isProcessing = processingIds.includes(sale.id);
            const allItemsRefunded = sale.sale_items.every((item: SaleItemDetail) => item.refunded);
            const isEffectivelyRefunded = sale.refunded || allItemsRefunded;
            const isImmediate = sale.payment_type === "immediate";
            const canDiscount = !isImmediate && !sale.payroll_processed && !isEffectivelyRefunded;
            const canRefund = !sale.payroll_processed && !isEffectivelyRefunded;
            const showActions = canDiscount || canRefund;
            const menu = getActionMenu(sale);
            return (
            <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4">
                <input
                  type="checkbox"
                  disabled={sale.payroll_processed || isEffectivelyRefunded || isProcessing || isImmediate}
                  checked={selectedSales.includes(sale.id)}
                  onChange={() => toggleSelection(sale.id)}
                  className="rounded border-gray-300 text-primary cursor-pointer disabled:opacity-30"
                />
              </td>
              <td className="px-6 py-4">
                <div className="space-y-1.5 min-w-55">
                  {sale.note && (
                    <p className="text-[10px] text-gray-500 italic mb-1">"{sale.note}"</p>
                  )}
                  {sale.sale_items.map((item: SaleItemDetail) => (
                    <div
                      key={item.products.id}
                      className={`flex justify-between items-center gap-3 text-[11px] ${item.refunded ? 'text-red-400' : 'text-gray-600'}`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`font-bold shrink-0 ${item.refunded ? 'text-red-400' : item.entrepreneur_processed ? 'text-emerald-500' : 'text-primary'}`}>
                          {item.quantity}x
                        </span>
                        <span className={`truncate ${item.refunded ? 'line-through' : ''}`}>{item.products.name}</span>
                        {item.refunded && (
                          <span className="text-[8px] font-bold text-red-500 bg-red-100 px-1 py-0.5 rounded shrink-0 ml-1">REEMBOLSADO</span>
                        )}
                        {item.entrepreneur_processed && !item.refunded && (
                          <span className="text-[8px] font-bold text-emerald-500 bg-emerald-100 px-1 py-0.5 rounded shrink-0 ml-1">PAGADO</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold italic shrink-0 ${item.refunded ? 'text-red-300' : 'text-gray-400'}`}>
                        {formatCurrency(item.unit_price)}
                      </span>
                    </div>
                  ))}
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
                  processedLabel="DESCONTADO"
                  refundedLabel="REEMBOLSADA"
                />
              </td>
              <td className="px-6 py-4 text-right font-bold text-gray-900">
                {formatCurrency(sale.total)}
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