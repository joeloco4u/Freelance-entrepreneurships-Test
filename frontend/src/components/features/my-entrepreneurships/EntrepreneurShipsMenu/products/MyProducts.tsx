import type { MenuProps } from "antd";
import { Edit2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useProducts } from "../../../../../hooks/useProducts";
import type { EntrepreneurshipProduct } from "../../../../../types";
import ConfirmationModal from "../../../../shared/ConfirmationModal";
import ProductCardsMobile from "./ProductCardsMobile";
import ProductEmptyState from "./ProductEmptyState";
import ProductFilters from "./ProductFilters";
import ProductFormModal from "./ProductFormModal";
import ProductHeader from "./ProductHeader";
import ProductTableDesktop from "./ProductTableDesktop";
import ProductTableSkeleton from "./ProductTableSkeleton";
import StockMatrixModal from "./StockMatrixModal";

export default function MyProducts() {
  const { id: entrepreneurshipId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    products,
    allProducts,
    loading,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    statusFilter,
    setStatusFilter,
    stockFilter,
    setStockFilter,
    formModal,
    deleteModal,
    isSaving,
    openFormModal,
    closeFormModal,
    openDeleteModal,
    closeDeleteModal,
    saveProduct,
    confirmDelete,
    refreshProducts,
  } = useProducts(entrepreneurshipId);

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const hasEditableProducts = useMemo(
    () => allProducts.some((product) => !product.is_composed),
    [allProducts],
  );

  const getActionMenuItems = (product: EntrepreneurshipProduct): MenuProps => ({
    items: [
      {
        key: "edit",
        label: "Editar producto",
        icon: <Edit2 size={14} />,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          openFormModal(product);
        },
      },
      {
        key: "delete",
        label: "Eliminar producto",
        icon: <Trash2 size={14} />,
        danger: true,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          openDeleteModal(product.id, product.name);
        },
      },
    ],
  });

  useEffect(() => {
    if (location.state?.openModal === true) {
      openFormModal();
      navigate(location.pathname, { replace: true, state: {} });
    }
    if (location.state?.lowStockFilter === true) {
      setStockFilter("low-stock");
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.openModal, location.state?.lowStockFilter, openFormModal, navigate, location.pathname, setStockFilter]);

  if (loading) return <ProductTableSkeleton />;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <ProductHeader
        onAddProduct={() => openFormModal()}
        onEditStock={() => setIsStockModalOpen(true)}
        disableStockButton={!hasEditableProducts}
      />

      <ProductFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        stockFilter={stockFilter}
        onStockChange={setStockFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {products.length === 0 ? (
        <ProductEmptyState
          searchQuery={searchQuery}
          onAddProduct={() => openFormModal()}
        />
      ) : (
        <>
          <ProductTableDesktop
            products={products}
            getActionMenu={getActionMenuItems}
          />
          <ProductCardsMobile
            products={products}
            getActionMenu={getActionMenuItems}
          />
        </>
      )}

      {/* Modales */}
      <ProductFormModal
        key={formModal.product?.id || "new-product"}
        isOpen={formModal.isOpen}
        product={formModal.product || null}
        composedData={formModal.composedData}
        isLoading={isSaving}
        onClose={closeFormModal}
        onSave={saveProduct}
        entrepreneurshipId={entrepreneurshipId ?? ""}
      />

      {isStockModalOpen && (
        <StockMatrixModal
          isOpen={isStockModalOpen}
          entrepreneurshipId={entrepreneurshipId ?? ""}
          onClose={() => setIsStockModalOpen(false)}
          onSaved={refreshProducts}
        />
      )}

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        isLoading={isSaving}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Eliminar Producto"
        message={`¿Estás seguro de que deseas eliminar "${deleteModal.name}"?`}
        confirmText="Eliminar"
        type="danger"
      />
    </div>
  );
}
