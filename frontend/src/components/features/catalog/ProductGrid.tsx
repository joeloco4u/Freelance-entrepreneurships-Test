import { AlertCircle, Search } from "lucide-react";
import type { CartHook, CatalogProduct, ProductCardData } from "../../../types";
import ProductCard from "./ProductCard";
import ProductCardSkeleton from "./ProductCardSkeleton";

interface ProductGridProps {
  loading: boolean;
  page: number;
  products: CatalogProduct[];
  cart: CartHook;
  error?: string | null;
  onRetry?: () => void;
}

const SKELETON_ITEMS = Array.from({ length: 8 }, (_, i) => `skeleton-id-${i}`);

export const ProductGrid = ({
  loading,
  page,
  products,
  cart,
  error = null,
  onRetry,
}: ProductGridProps) => {
  // 1. Estado de Carga Inicial
  if (loading && page === 1) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 md:gap-6">
        {SKELETON_ITEMS.map((id) => (
          <ProductCardSkeleton key={id} />
        ))}
      </div>
    );
  }

  // 2. Estado de Error sin productos cargados
  if (error && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-3xl border border-dashed border-red-200">
        <AlertCircle size={40} className="text-red-400 opacity-40 mb-4" />
        <p className="text-sm text-red-700 text-center max-w-md px-4">
          {error}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={loading}
            className="mt-6 rounded-2xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reintentar
          </button>
        )}
      </div>
    );
  }

  // 3. Estado Sin Resultados (solo si no hay error)
  if (!error && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
        <Search size={40} className="opacity-10 mb-4" />
        <p className="text-sm">No encontramos lo que buscas</p>
      </div>
    );
  }

  // 4. Renderizado de Productos
  return (
    <>
      {error && (
        <div
          role="alert"
          className="mb-4 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
            <span>{error}</span>
          </span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={loading}
              className="shrink-0 self-start rounded-xl bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
            >
              Reintentar
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 md:gap-6">
        {products.map((p: CatalogProduct) => {
          // Construimos el objeto compatible con ProductCardData
          const cardData: ProductCardData = {
            id: p.id,
            name: p.name,
            price: p.price,
            current_stock: p.current_stock,
            image: p.image,
            category_id: p.category_id,
            vendor: p.entrepreneurships.name,
            is_composed: p.is_composed,
          };

          return (
            <ProductCard
              key={p.id}
              product={cardData}
              qty={cart.cart[p.id] ?? 0}
              onAdd={() => cart.addToCart(p.id)}
            />
          );
        })}
      </div>
    </>
  );
};
