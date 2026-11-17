import { Dropdown, type MenuProps } from "antd";
import { MoreVertical, Package } from "lucide-react";
import {
  LOCATIONS,
  type AdminSedeFilter,
} from "../../../../../config/locations";
import type { EntrepreneurshipProduct } from "../../../../../types";
import { formatCurrency } from "../../../../../utils/format";
import {
  getOfferedSedeCodes,
  getSedeStockEntries,
} from "../../../../../utils/productStock";
import { SedeBadge } from "../../../../shared/SedeBadge";

interface Props {
  products: EntrepreneurshipProduct[];
  getActionMenu: (product: EntrepreneurshipProduct) => MenuProps;
  sedeFilter: AdminSedeFilter;
}

export default function ProductCardsMobile({
  products,
  getActionMenu,
  sedeFilter,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:hidden">
      {products.map((product) => {
        const codes = getOfferedSedeCodes(product);
        const stockEntries = getSedeStockEntries(product, sedeFilter);
        const stockLabel =
          stockEntries.length === 0
            ? "Stock no disponible"
            : `Stock ${stockEntries
                .map(
                  (entry) =>
                    `${LOCATIONS[entry.code].name}: ${entry.stock} unidades`,
                )
                .join(", ")}`;
        return (
          <div
            key={product.id}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex gap-4 relative active:scale-[0.98] transition-transform"
          >
            <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  className="object-cover w-full h-full"
                  alt={product.name}
                  loading="lazy"
                />
              ) : (
                <Package size={24} />
              )}
            </div>
            <div className="flex flex-col justify-between flex-1 min-w-0">
              <div>
                <div className="flex items-center gap-2 pr-10">
                  <h3 className="font-bold text-gray-900 text-sm truncate uppercase tracking-tight min-w-0">
                    {product.name}
                  </h3>
                  {product.is_composed && (
                    <span className="shrink-0 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold uppercase">
                      Combo
                    </span>
                  )}
                  <div className="shrink-0">
                    <SedeBadge codes={codes} />
                  </div>
                </div>
                <p className="text-primary font-black text-base mt-0.5">
                  {formatCurrency(product.price)}
                </p>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div
                  role="group"
                  aria-label={stockLabel}
                  title={
                    product.is_composed
                      ? "Stock calculado a partir de los componentes del combo"
                      : undefined
                  }
                  className="flex flex-wrap items-center gap-1.5"
                >
                  {stockEntries.length === 0 ? (
                    <span
                      aria-hidden="true"
                      className="text-[11px] font-bold text-gray-300 bg-gray-50 px-2 py-0.5 rounded-lg"
                    >
                      —
                    </span>
                  ) : sedeFilter === "ALL" ? (
                    stockEntries.map((entry) => (
                      <span
                        key={entry.code}
                        aria-hidden="true"
                        className={`text-[11px] font-bold ${entry.isLow ? "text-amber-600 bg-amber-50" : "text-gray-500 bg-gray-50"} px-2 py-0.5 rounded-lg`}
                      >
                        {entry.code}: {entry.stock} un.
                      </span>
                    ))
                  ) : (
                    <span
                      aria-hidden="true"
                      className={`text-[11px] font-bold ${stockEntries[0].isLow ? "text-amber-600 bg-amber-50" : "text-gray-500 bg-gray-50"} px-2 py-0.5 rounded-lg`}
                    >
                      Stock: {stockEntries[0].stock}
                    </span>
                  )}
                </div>
                <span
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${product.is_active ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}
                >
                  {product.is_active ? "Activo" : "Pausado"}
                </span>
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <Dropdown
                menu={getActionMenu(product)}
                trigger={["click"]}
                placement="bottomRight"
              >
                <button
                  type="button"
                  aria-label="Acciones del producto"
                  className="text-gray-400 p-2 rounded-lg active:bg-gray-100 cursor-pointer"
                >
                  <MoreVertical size={20} />
                </button>
              </Dropdown>
            </div>
          </div>
        );
      })}
    </div>
  );
}
