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

export default function ProductTableDesktop({
  products,
  getActionMenu,
  sedeFilter,
}: Props) {
  return (
    <div className="hidden md:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th
              scope="col"
              className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider"
            >
              Producto
            </th>
            <th
              scope="col"
              className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider"
            >
              Precio
            </th>
            <th
              scope="col"
              className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider"
            >
              Stock
            </th>
            <th
              scope="col"
              className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider"
            >
              Estado
            </th>
            <th scope="col" className="px-6 py-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
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
              <tr
                key={product.id}
                className="hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3 min-w-0">
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
                    <span className="min-w-0 flex-1 font-semibold text-gray-700 truncate">
                      {product.name}
                    </span>
                    {product.is_composed && (
                      <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold uppercase">
                        Combo
                      </span>
                    )}
                    <div className="shrink-0">
                      <SedeBadge codes={codes} />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-gray-600">
                  {formatCurrency(product.price)}
                </td>
                <td className="px-6 py-4">
                  <div
                    role="group"
                    aria-label={stockLabel}
                    title={
                      product.is_composed
                        ? "Stock calculado a partir de los componentes del combo"
                        : undefined
                    }
                  >
                    {stockEntries.length === 0 ? (
                      <span
                        aria-hidden="true"
                        className="text-sm font-bold text-gray-300"
                      >
                        —
                      </span>
                    ) : sedeFilter === "ALL" ? (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {stockEntries.map((entry, index) => (
                          <div
                            key={entry.code}
                            className="flex items-center gap-2"
                          >
                            {index > 0 && (
                              <span className="text-gray-300" aria-hidden="true">
                                |
                              </span>
                            )}
                            <div aria-hidden="true">
                              <SedeBadge codes={[entry.code]} />
                            </div>
                            <span
                              aria-hidden="true"
                              className={`text-sm font-bold ${entry.isLow ? "text-amber-500" : "text-gray-500"}`}
                            >
                              {entry.stock} un.
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span
                        aria-hidden="true"
                        className={`text-sm font-bold ${stockEntries[0].isLow ? "text-amber-500" : "text-gray-500"}`}
                      >
                        {stockEntries[0].stock} un.
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${product.is_active ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}
                  >
                    {product.is_active ? "Activo" : "Pausado"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Dropdown
                    menu={getActionMenu(product)}
                    trigger={["click"]}
                    placement="bottomRight"
                  >
                    <button
                      type="button"
                      aria-label="Acciones del producto"
                      className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
                    >
                      <MoreVertical size={18} />
                    </button>
                  </Dropdown>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
