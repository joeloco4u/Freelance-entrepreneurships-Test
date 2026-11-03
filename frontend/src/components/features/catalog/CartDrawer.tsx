import {
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useEffect } from "react";
import type { CatalogProduct } from "../../../types";

interface CartEntry {
  product: CatalogProduct;
  qty: number;
}

interface Props {
  isOpen: boolean;
  entries: CartEntry[];
  total: number;
  onClose: () => void;
  onChangeQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);

export default function CartDrawer({
  isOpen,
  entries,
  total,
  onClose,
  onChangeQty,
  onRemove,
  onCheckout,
}: Props) {
  useEffect(() => {
    if (isOpen) {
      // Guardamos la posición actual para evitar que la página salte al inicio
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflowY = "hidden";
    } else {
      // Restauramos todo al cerrar
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflowY = "";

      // Devolvemos al usuario a donde estaba
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0", 10) * -1);
      }
    }

    return () => {
      // Limpieza por si el componente se desmonta inesperadamente
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflowY = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <button
          type="button"
          className="fixed hidden md:block inset-0 bg-black/30 z-20"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
        className={`fixed top-0 right-0 bottom-0 w-95 bg-white z-30 flex flex-col transition-transform duration-200 shadow-2xl ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } w-full md:w-[30%] pb-20 md:pb-0`}
      >
        {/* Header */}
        <div className="bg-primary px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingCart size={18} className="text-white" />
            <span className="font-display font-semibold text-white text-lg">
              Tu carrito
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar carrito"
            className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 cursor-pointer flex items-center justify-center text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <ShoppingCart size={44} className="opacity-20" />
              <p className="text-sm">Tu carrito está vacío</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {entries.map(({ product, qty }) => (
                <div
                  key={product.id}
                  className="flex gap-3 p-3 bg-gray-50 rounded-xl"
                >
                  {/* Product image */}
                  <div className="w-14 h-14 bg-blue-50 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShoppingBag size={20} className="text-primary/30" />
                    )}
                  </div>

                  {/* Info + controls */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate mb-1">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-400 mb-2">
                      {fmt(product.price)} c/u
                    </p>

                    {/* Qty controls */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onChangeQty(product.id, -1)}
                        aria-label="Reducir cantidad"
                        className="w-7 h-7 border cursor-pointer border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:border-primary hover:text-primary transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="font-display font-bold text-primary text-sm min-w-5 text-center">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onChangeQty(product.id, 1)}
                        disabled={qty >= product.current_stock}
                        aria-label="Aumentar cantidad"
                        className="w-7 h-7 border cursor-pointer border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:border-primary hover:text-primary transition-colors disabled:opacity-30"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Subtotal + remove */}
                  <div className="flex flex-col items-end justify-between shrink-0">
                    <span className="font-display text-sm font-bold text-primary">
                      {fmt(product.price * qty)}
                    </span>
                          <button
                            type="button"
                            onClick={() => onRemove(product.id)}
                            aria-label="Eliminar producto"
                            className="text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500">Total a pagar</span>
            <span className="font-display text-2xl font-bold text-primary">
              {fmt(total)}
            </span>
          </div>
          <button
            type="button"
            disabled={entries.length === 0}
            onClick={onCheckout}
            className="w-full py-3.5 cursor-pointer bg-primary hover:bg-primary-dark text-white rounded-xl font-medium transition-colors disabled:opacity-40 disabled:cursor-default"
          >
            Finalizar compra
          </button>
        </div>
      </div>
    </>
  );
}
