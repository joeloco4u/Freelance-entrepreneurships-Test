import { AlertCircle, Package, Store, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LOCATIONS, LOCATION_CODES } from "../../../../config/locations";
import type { SedeInventoryBreakdown } from "../../../../types";

interface Props {
  id: string;
  totalProducts: number;
  lowStock: number;
  outOfStock: number;
  inventoryBySede: SedeInventoryBreakdown;
}

export default function InventoryAndTips({
  id,
  totalProducts,
  lowStock,
  outOfStock,
  inventoryBySede,
}: Props) {
  const navigate = useNavigate();
  const hasLowStock =
    lowStock > 0 ||
    LOCATION_CODES.some((location) => inventoryBySede[location].lowStock > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900">
            Estado del Inventario
          </h3>
          <Package size={20} className="text-gray-400" />
        </div>
        <div className="space-y-6">
          {hasLowStock && (
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl border border-orange-100">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-orange-500" size={20} />
                <div>
                  <p className="text-sm font-bold text-orange-900">
                    Stock Bajo
                  </p>
                  <p className="text-xs text-orange-700">
                    {lowStock} productos por agotarse
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  navigate(`/dashboard/entrepreneurships/${id}/products`, {
                    state: { lowStockFilter: true },
                  })
                }
                className="text-xs font-bold text-orange-600 hover:underline cursor-pointer"
              >
                Revisar
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {totalProducts}
              </p>
              <p className="text-[10px] text-gray-500 uppercase font-bold">
                Total Productos
              </p>
            </div>
            <div
              className={`p-4 rounded-2xl border text-center ${outOfStock > 0 ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}
            >
              <p
                className={`text-2xl font-bold ${outOfStock > 0 ? "text-red-600" : "text-gray-900"}`}
              >
                {outOfStock}
              </p>
              <p className="text-[10px] text-gray-500 uppercase font-bold">
                Sin Stock
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Por sede
            </p>
            <div className="space-y-1.5">
              {LOCATION_CODES.map((location) => {
                const inventory = inventoryBySede[location];
                return (
                  <p key={location} className="text-xs text-gray-500">
                    <span className="font-medium text-gray-600">
                      {LOCATIONS[location].name}:
                    </span>{" "}
                    {inventory.lowStock} en stock bajo •{" "}
                    {inventory.outOfStock} agotado
                    {inventory.outOfStock === 1 ? "" : "s"}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-primary/5 p-8 rounded-3xl border border-primary/10 relative overflow-hidden group flex flex-col justify-center">
        <div className="relative z-10">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
            <TrendingUp size={20} />
          </div>
          <h3 className="text-lg font-bold text-primary mb-2">
            Tip para vender más
          </h3>
          <p className="text-primary/80 text-sm leading-relaxed mb-6">
            {outOfStock > 0
              ? `Tienes ${outOfStock} productos agotados. Reponer stock es la forma más rápida de recuperar ventas perdidas.`
              : "¡Tu inventario está al día! Intenta crear un cupón de descuento para incentivar a tus clientes actuales."}
          </p>
        </div>
        <Store className="absolute -bottom-6 -right-6 text-primary/5 w-40 h-40 rotate-12" />
      </div>
    </div>
  );
}
