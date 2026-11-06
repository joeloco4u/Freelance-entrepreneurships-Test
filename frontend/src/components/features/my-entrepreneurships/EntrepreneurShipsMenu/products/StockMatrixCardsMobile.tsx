import { Switch } from "antd";
import { Package } from "lucide-react";
import { memo } from "react";
import {
  LOCATIONS,
  LOCATION_CODES,
  type LocationCode,
  type ProductStocks,
} from "../../../../../config/locations";
import type { EntrepreneurshipProduct } from "../../../../../types";
import { MAX_STOCK } from "../../../../../constants/stock";
import { SedeBadge } from "../../../../shared/SedeBadge";

interface Props {
  products: EntrepreneurshipProduct[];
  draft: Record<string, ProductStocks>;
  onToggleOffered: (
    productId: string,
    location: LocationCode,
    offered: boolean,
  ) => void;
  onStockChange: (
    productId: string,
    location: LocationCode,
    stock: number,
  ) => void;
  disabled: boolean;
}

interface CardProps {
  product: EntrepreneurshipProduct;
  stocks: ProductStocks;
  disabled: boolean;
  onToggleOffered: Props["onToggleOffered"];
  onStockChange: Props["onStockChange"];
}

const StockMatrixCard = memo(function StockMatrixCard({
  product,
  stocks,
  disabled,
  onToggleOffered,
  onStockChange,
}: CardProps) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 overflow-hidden shrink-0">
          {product.image ? (
            <img
              src={product.image}
              className="object-cover w-full h-full"
              alt={product.name}
              loading="lazy"
            />
          ) : (
            <Package size={20} />
          )}
        </div>
        <span className="font-semibold text-gray-700">{product.name}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {LOCATION_CODES.map((location) => {
          const cell = stocks[location];

          return (
            <div key={location} className="space-y-2">
              <div className="flex items-center gap-2">
                <SedeBadge codes={[location]} />
                <span className="text-xs font-semibold text-gray-500">
                  {LOCATIONS[location].name}
                </span>
              </div>

              <div
                role="group"
                aria-label={`Ofrecer ${product.name} en ${LOCATIONS[location].name}`}
                className="space-y-2"
              >
                <label className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-500">
                    Ofrecer
                  </span>
                  <Switch
                    size="small"
                    checked={cell.offered}
                    disabled={disabled}
                    onChange={(checked) =>
                      onToggleOffered(product.id, location, checked)
                    }
                    title="Si se desactiva, el producto se elimina de esta sede."
                    style={{
                      backgroundColor: cell.offered
                        ? "var(--color-primary)"
                        : undefined,
                    }}
                  />
                </label>

                <div>
                  <input
                    type="number"
                    min={0}
                    max={MAX_STOCK}
                    step={1}
                    inputMode="numeric"
                    value={cell.stock}
                    onChange={(event) => {
                      const value = Number.parseInt(event.target.value, 10);
                      onStockChange(
                        product.id,
                        location,
                        Number.isNaN(value) ? 0 : value,
                      );
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.preventDefault();
                    }}
                    disabled={disabled || !cell.offered}
                    aria-label={`Stock de ${product.name} en ${LOCATIONS[location].name}`}
                    title="Stock 0 = Agotado. El producto sigue visible en el catálogo."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-center disabled:bg-gray-50 disabled:text-gray-400"
                  />

                  <div className="mt-1">
                    {!cell.offered ? (
                      <span className="text-[10px] font-bold uppercase text-gray-400">
                        No ofrecido
                      </span>
                    ) : cell.stock === 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[10px] font-bold uppercase">
                        Agotado
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default function StockMatrixCardsMobile({
  products,
  draft,
  onToggleOffered,
  onStockChange,
  disabled,
}: Props) {
  return (
    <div className="md:hidden space-y-3">
      {products.map((product) => {
        const stocks = draft[product.id];
        if (!stocks) return null;

        return (
          <StockMatrixCard
            key={product.id}
            product={product}
            stocks={stocks}
            disabled={disabled}
            onToggleOffered={onToggleOffered}
            onStockChange={onStockChange}
          />
        );
      })}
    </div>
  );
}
