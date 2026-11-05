import { ChevronDown, ChevronUp, RotateCcw, ShoppingBag, Store } from "lucide-react";
import type { ConsumerSale } from "../../../types";
import StatusBadge, { PaymentMethodBadge, PaymentTypeLabel } from "./shared/StatusBadge";

interface Props {
  sales: ConsumerSale[];
  loading: boolean;
  expandedId: string | null;
  onToggle: (id: string) => void;
  fmt: (n: number) => string;
}

export default function MyPurchasesMobile({
  sales,
  loading,
  expandedId,
  onToggle,
  fmt,
}: Props) {
  if (loading) {
    return (
      <div className="md:hidden space-y-4 p-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-4xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="md:hidden space-y-4 p-1">
      {sales.map((sale) => (
        <div
          key={sale.id}
          className={`bg-white border transition-all duration-300 rounded-4xl overflow-hidden ${expandedId === sale.id ? "border-primary shadow-md" : "border-gray-100 shadow-sm"}`}
        >
          <button
            type="button"
            className="w-full p-5 flex items-center gap-3 justify-between"
            onClick={() => onToggle(sale.id)}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${expandedId === sale.id ? "bg-primary text-white" : "bg-gray-50 text-gray-400"}`}
              >
                <ShoppingBag size={20} />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs font-mono text-gray-400">
                  #{sale.id.slice(0, 8)}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="font-bold text-gray-900">{fmt(sale.total)}</p>
                  <PaymentMethodBadge paymentType={sale.payment_type} paymentMethod={sale.payment_method} />
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge
                processed={sale.payroll_processed}
                refunded={sale.refunded}
                paymentType={sale.payment_type}
                saleItems={sale.sale_items}
              />
              {expandedId === sale.id ? (
                <ChevronUp size={16} className="text-primary" />
              ) : (
                <ChevronDown size={16} className="text-gray-300" />
              )}
            </div>
          </button>

          {expandedId === sale.id && (
            <div className="px-5 pb-5 pt-2 space-y-3 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center justify-between text-[10px] uppercase font-black text-gray-400 tracking-widest border-t border-gray-50 pt-4 mb-2">
                <div className="flex items-center gap-2">
                  <span>Productos</span>
                  <PaymentTypeLabel paymentType={sale.payment_type} paymentMethod={sale.payment_method} />
                </div>
                <span>{new Date(sale.created_at).toLocaleDateString()}</span>
              </div>
              {sale.sale_items.map((item) => (
                <div
                  key={item.products.name}
                  className={`flex justify-between items-center p-3 rounded-2xl ${item.refunded ? 'bg-red-50/50' : 'bg-gray-50'}`}
                >
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-bold truncate ${item.refunded ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {item.products.name}
                      </p>
                      {item.refunded && (
                        <span className="inline-flex items-center gap-0.5 text-[8px] font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded uppercase shrink-0">
                          <RotateCcw size={8} /> Reembolsado
                        </span>
                      )}
                      {item.entrepreneur_processed && !item.refunded && (
                        <span className="inline-flex items-center gap-0.5 text-[8px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded uppercase shrink-0">
                          Pagado
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] flex items-center gap-1 ${item.refunded ? 'text-red-300' : 'text-gray-500'}`}>
                      <Store size={10} /> {item.products.entrepreneurships.name}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className={`text-xs font-bold ${item.refunded ? 'text-red-400 line-through' : 'text-primary'}`}>
                      {fmt(item.unit_price * item.quantity)}
                    </p>
                    <p className={`text-[10px] ${item.refunded ? 'text-red-300' : 'text-gray-400'}`}>
                      {item.quantity} u.
                    </p>
                  </div>
                </div>
              ))}
              {sale.note && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Nota
                  </p>
                  <p className="text-xs text-gray-600 italic whitespace-pre-wrap break-words">
                    "{sale.note}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
