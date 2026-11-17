import { Package, Plus } from "lucide-react";

interface Props {
  searchQuery: string;
  isFiltering: boolean;
  onAddProduct: () => void;
}

export default function ProductEmptyState({
  searchQuery,
  isFiltering,
  onAddProduct,
}: Props) {
  const message = searchQuery
    ? `No encontramos resultados para "${searchQuery}"`
    : isFiltering
      ? "No encontramos resultados con los filtros actuales."
      : "Aún no has agregado productos a tu catálogo.";

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-100">
      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
        <Package size={32} className="text-gray-300" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">Sin productos</h3>
      <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
        {message}
      </p>

      {!isFiltering && (
        <button
          type="button"
          onClick={onAddProduct}
          className="mt-6 text-primary font-bold text-sm flex items-center gap-2"
        >
          <Plus size={16} /> Crear mi primer producto
        </button>
      )}
    </div>
  );
}
