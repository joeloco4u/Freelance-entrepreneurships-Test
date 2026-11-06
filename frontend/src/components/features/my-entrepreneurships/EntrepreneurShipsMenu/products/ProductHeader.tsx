import { LayoutGrid, Plus } from "lucide-react";

interface Props {
  onAddProduct: () => void;
  onEditStock: () => void;
  disableStockButton?: boolean;
}

export default function ProductHeader({
  onAddProduct,
  onEditStock,
  disableStockButton = false,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <h2 className="text-xl font-bold text-gray-900">Mis Productos</h2>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <button
          type="button"
          onClick={onEditStock}
          disabled={disableStockButton}
          title="Editar stock por sede"
          className="w-full sm:w-auto border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LayoutGrid size={18} /> Editar stock
        </button>
        <button
          type="button"
          onClick={onAddProduct}
          className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all shadow-sm cursor-pointer"
        >
          <Plus size={18} /> Agregar Producto
        </button>
      </div>
    </div>
  );
}
