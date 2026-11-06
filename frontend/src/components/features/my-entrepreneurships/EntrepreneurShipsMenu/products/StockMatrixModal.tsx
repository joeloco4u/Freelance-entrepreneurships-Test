import { Spin } from "antd";
import { AlertCircle, Info, Package } from "lucide-react";
import { useMemo, useState } from "react";
import type React from "react";
import { useStockMatrix } from "../../../../../hooks/useStockMatrix";
import { MAX_STOCK_MATRIX_ITEMS } from "../../../../../constants/stock";
import BaseFormModal from "../../../../shared/BaseFormModal";
import SearchInput from "../../../../shared/SearchInput";
import StockMatrixCardsMobile from "./StockMatrixCardsMobile";
import StockMatrixTable from "./StockMatrixTable";

interface Props {
  isOpen: boolean;
  entrepreneurshipId: string;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}

export default function StockMatrixModal({
  isOpen,
  entrepreneurshipId,
  onClose,
  onSaved,
}: Props) {
  const {
    products,
    draft,
    composedCount,
    loading,
    error,
    isSaving,
    dirtyCount,
    setStock,
    toggleOffered,
    save,
    reload,
  } = useStockMatrix(entrepreneurshipId, isOpen);

  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) =>
      product.name.toLowerCase().includes(query),
    );
  }, [products, searchQuery]);

  const isOverLimit = dirtyCount > MAX_STOCK_MATRIX_ITEMS;

  const handleClose = () => {
    if (isSaving) return;
    setSearchQuery("");
    onClose();
  };

  const handleSubmit = async (event: React.SubmitEvent) => {
    event.preventDefault();

    if (isSaving || dirtyCount === 0 || isOverLimit) return;

    const saved = await save();
    if (saved) {
      setSearchQuery("");
      onClose();
      void onSaved?.();
    }
  };

  return (
    <BaseFormModal
      isOpen={isOpen}
      onClose={handleClose}
      onSubmit={handleSubmit}
      title="Editar stock por sede"
      confirmText="Guardar cambios"
      isLoading={isSaving}
      maxWidth="3xl"
      submitDisabled={loading || dirtyCount === 0 || isOverLimit}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-2xl p-3 text-xs text-blue-800">
          <Info size={16} className="shrink-0 mt-0.5" />
          <p>
            Stock 0 = Agotado: el producto sigue visible en el catálogo. Si
            desactivas Ofrecer, el producto se elimina de esa sede.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar producto..."
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
          />

          {dirtyCount > 0 && (
            <span
              className={`inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border ${
                isOverLimit
                  ? "bg-red-50 text-red-600 border-red-100"
                  : "bg-amber-50 text-amber-600 border-amber-100"
              }`}
            >
              {isOverLimit
                ? `Máximo ${MAX_STOCK_MATRIX_ITEMS} productos por guardado`
                : `${dirtyCount} ${
                    dirtyCount === 1
                      ? "cambio sin guardar"
                      : "cambios sin guardar"
                  }`}
            </span>
          )}
        </div>

        {composedCount > 0 && products.length > 0 && (
          <p className="text-xs text-gray-400">
            Los combos no se editan aquí: su stock se calcula a partir de sus
            componentes.
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spin size="large" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <AlertCircle size={32} className="text-red-400" />
            <p className="text-sm text-gray-500">{error}</p>
            <button
              type="button"
              onClick={reload}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-all cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package size={32} className="text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">
              No hay productos simples para editar.
            </p>
            {composedCount > 0 && (
              <p className="mt-1 text-xs text-gray-400">
                Los combos no se editan aquí: su stock se calcula a partir de
                sus componentes.
              </p>
            )}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package size={32} className="text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">
              No se encontraron productos con ese nombre.
            </p>
          </div>
        ) : (
          <>
            <StockMatrixTable
              products={filteredProducts}
              draft={draft}
              onToggleOffered={toggleOffered}
              onStockChange={setStock}
              disabled={isSaving}
            />
            <StockMatrixCardsMobile
              products={filteredProducts}
              draft={draft}
              onToggleOffered={toggleOffered}
              onStockChange={setStock}
              disabled={isSaving}
            />
          </>
        )}
      </div>
    </BaseFormModal>
  );
}
