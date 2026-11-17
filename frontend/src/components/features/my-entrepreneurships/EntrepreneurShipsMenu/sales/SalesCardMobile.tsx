import { Dropdown, type MenuProps } from "antd";
import { Calendar, DollarSign, MoreVertical, RotateCcw, User } from "lucide-react";
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
  processingIds: string[];
}

export default function SalesCardsMobile({
  sales,
  onRefund,
  onProcessPayment,
  selectedSales,
  toggleSelection,
  processingIds,
}: Props) {
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
    <div className="grid grid-cols-1 gap-4 p-4">
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
          <div key={sale.id} className="bg-white p-5 rounded-4xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  disabled={!canRefund || isProcessing}
                  checked={selectedSales.includes(sale.id)}
                  onChange={() => toggleSelection(sale.id)}
                  className="w-5 h-5 rounded-lg text-primary cursor-pointer disabled:opacity-30 shrink-0"
                />
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
                  <User size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-gray-900 truncate uppercase tracking-tight min-w-0">{sale.users.name}</span>
                    <PaymentTypeLabel paymentType={sale.payment_type} paymentMethod={sale.payment_method} />
                    <div className="shrink-0">
                      <SedeBadge codes={sale.location_id ? [sale.location_id] : []} />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono">#{sale.id.slice(0, 8).toUpperCase()}</p>
                  {sale.note && (
                    <p className="text-[10px] text-gray-500 italic mt-0.5 truncate">"{sale.note}"</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge
                  processed={sale.payroll_processed}
                  refunded={sale.refunded}
                  paymentType={sale.payment_type}
                  saleItems={sale.sale_items}
                />
                {hasActions && (
                  <Dropdown menu={menu} trigger={["click"]} placement="bottomRight">
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-300 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </Dropdown>
                )}
              </div>
            </div>
            <div className="bg-gray-50/50 rounded-2xl p-3 space-y-2">
              {sale.sale_items.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-[11px]">
                  <span className={`truncate max-w-[70%] ${item.refunded ? 'text-gray-400' : 'text-gray-600'}`}>
                    <span className={`font-bold mr-1 ${item.refunded ? 'text-red-400' : item.entrepreneur_processed ? 'text-emerald-500' : 'text-primary'}`}>{item.quantity}x</span>
                    <span className={item.refunded ? 'line-through' : ''}>{item.products.name}</span>
                    {item.refunded && (
                      <span className="text-[8px] font-bold text-red-500 bg-red-100 px-1 py-0.5 rounded ml-1">REEMBOLSADO</span>
                    )}
                    {item.entrepreneur_processed && !item.refunded && (
                      <span className="text-[8px] font-bold text-emerald-500 bg-emerald-100 px-1 py-0.5 rounded ml-1">PAGADO</span>
                    )}
                  </span>
                  <span className={`font-bold italic ${item.refunded ? 'text-red-300' : 'text-gray-400'}`}>{formatCurrency(item.unit_price)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-end pt-2 border-t border-gray-50">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Fecha</span>
                <div className="flex items-center gap-1.5 text-xs text-gray-700 font-bold">
                  <Calendar size={13} className="text-primary" />
                  {new Date(sale.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total</p>
                <p className="text-lg font-black text-primary leading-tight">{formatCurrency(itemsTotal)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}