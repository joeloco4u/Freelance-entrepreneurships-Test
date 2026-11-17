import { Dropdown, type MenuProps } from "antd";
import {
  DollarSign,
  MoreVertical,
  RotateCcw,
  User,
} from "lucide-react";
import type { EntrepreneurshipSale } from "../../../../../types";
import { formatCurrency } from "../../../../../utils/format";
import { SedeBadge } from "../../../../shared/SedeBadge";
import StatusBadge, { PaymentTypeLabel } from "../../../my-purchases/shared/StatusBadge";

interface Props {
  sales: EntrepreneurshipSale[];
  onRefund: (sale: EntrepreneurshipSale) => void;
  onProcessPayment?: (sale: EntrepreneurshipSale) => void;
  selectedSales: string[];
  toggleSelection: (id: string) => void;
  toggleAll: () => void;
  processingIds: string[];
}

export default function SalesTableDesktop({
  sales,
  onRefund,
  onProcessPayment,
  selectedSales,
  toggleSelection,
  toggleAll,
  processingIds,
}: Props) {
  const refundableSales = sales.filter((sale) => {
    if (sale.payroll_processed) return false;
    const allItemsRefunded = sale.sale_items.every((item) => item.refunded);
    return !(sale.refunded || allItemsRefunded);
  });

  const getActionMenu = (sale: EntrepreneurshipSale): MenuProps => {
    const allRefunded = sale.sale_items.every((item) => item.refunded);
    const isEffectivelyRefunded = sale.refunded || allRefunded;
    const items: MenuProps["items"] = [];

    if (
      sale.payment_type === "immediate" &&
      !isEffectivelyRefunded &&
      !sale.payroll_processed &&
      sale.sale_items.some((item) => !item.entrepreneur_processed && !item.refunded)
    ) {
      items.push({
        key: "process",
        icon: <DollarSign size={14} />,
        label: "Pago recibido",
        onClick: () => onProcessPayment?.(sale),
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
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-100">
            <th className="px-6 py-4 w-10">
              <input
                type="checkbox"
                checked={
                  refundableSales.length > 0 &&
                  refundableSales.every((s) => selectedSales.includes(s.id))
                }
                onChange={toggleAll}
                className="rounded text-primary cursor-pointer"
              />
            </th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Productos</th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fecha</th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estado</th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Monto</th>
            <th className="px-6 py-4 w-12"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sales.map((sale) => {
            const allItemsRefunded = sale.sale_items.every((item) => item.refunded);
            const isEffectivelyRefunded = sale.refunded || allItemsRefunded;
            const canRefund = !sale.payroll_processed && !isEffectivelyRefunded;
            const isProcessing = processingIds.includes(sale.id);
            const itemsTotal = sale.sale_items.reduce((sum, item) => sum + Number(item.subtotal), 0);
            const hasActions =
              (sale.payment_type === "immediate" &&
                !isEffectivelyRefunded &&
                sale.sale_items.some((item) => !item.entrepreneur_processed && !item.refunded)) ||
              canRefund;
            const menu = getActionMenu(sale);
            return (
              <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    disabled={!canRefund || isProcessing}
                    checked={selectedSales.includes(sale.id)}
                    onChange={() => toggleSelection(sale.id)}
                    className="rounded text-primary cursor-pointer disabled:opacity-30"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 group-hover:bg-white transition-colors">
                      <User size={16} />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-gray-900">{sale.users.name}</span>
                        <PaymentTypeLabel paymentType={sale.payment_type} paymentMethod={sale.payment_method} />
                        <SedeBadge codes={sale.location_id ? [sale.location_id] : []} />
                      </div>
                      <p className="text-[11px] text-gray-400">{sale.users.email}</p>
                      {sale.note && (
                        <p className="text-[11px] text-gray-500 italic mt-0.5">"{sale.note}"</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1.5 min-w-50">
                    {sale.sale_items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-600 truncate">
                          <span className={`font-bold shrink-0 px-1 rounded ${item.refunded ? 'text-red-400 bg-red-50' : item.entrepreneur_processed ? 'text-emerald-500 bg-emerald-50' : 'text-primary bg-primary/5'}`}>{item.quantity}x</span>
                          <span className={`truncate ${item.refunded ? 'text-gray-400 line-through' : ''}`}>{item.products.name}</span>
                          {item.refunded && (
                            <span className="text-[8px] font-bold text-red-500 bg-red-100 px-1 py-0.5 rounded shrink-0 ml-1">REEMBOLSADO</span>
                          )}
                          {item.entrepreneur_processed && !item.refunded && (
                            <span className="text-[8px] font-bold text-emerald-500 bg-emerald-100 px-1 py-0.5 rounded shrink-0 ml-1">PAGADO</span>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold italic shrink-0 ${item.refunded ? 'text-red-300' : 'text-gray-400'}`}>{formatCurrency(item.unit_price)}</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                  {new Date(sale.created_at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge
                    processed={sale.payroll_processed}
                    refunded={sale.refunded}
                    paymentType={sale.payment_type}
                    saleItems={sale.sale_items}
                  />
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(itemsTotal)}</span>
                    <span className="text-[9px] text-gray-400 font-mono">#{sale.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  {hasActions ? (
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
}