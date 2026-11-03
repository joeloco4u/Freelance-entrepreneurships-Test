import { Modal } from "antd";
import { useCallback, useEffect, useState } from "react";
import CartDrawer from "../components/features/catalog/CartDrawer";
import CatalogHeader from "../components/features/catalog/CatalogHeader";
import CatalogHero from "../components/features/catalog/CatalogHero";
import CatalogPagination from "../components/features/catalog/CatalogPagination";
import CatalogSidebar from "../components/features/catalog/CatalogSidebar";
import CatalogToolbar from "../components/features/catalog/CatalogToolbar";
import CheckoutModal from "../components/features/catalog/CheckoutModal";
import LocationPromptModal from "../components/features/catalog/LocationPromptModal";
import { ProductGrid } from "../components/features/catalog/ProductGrid";
import {
  DEFAULT_LOCATION,
  LOCATIONS,
  type LocationCode,
} from "../config/locations";
import { useCart } from "../hooks/useCart";
import { useCatalog } from "../hooks/useCatalog";
import { useCheckout } from "../hooks/useCheckout";
import { useSede } from "../hooks/useSede";

export default function CatalogPage() {
  const { sede, setSede } = useSede();
  const activeSede = sede ?? DEFAULT_LOCATION;
  const catalog = useCatalog();
  const cart = useCart(catalog.allProducts);
  const checkout = useCheckout({
    cartEntries: cart.cartEntries,
    clearCart: cart.clearCart,
    refreshProducts: catalog.refreshProducts,
    closeCartDrawer: () => cart.setDrawer(false),
  });

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const chooseSede = (code: LocationCode) => {
    cart.clearCart();
    cart.setDrawer(false);
    setSede(code);
  };

  const handleSedeChange = (code: LocationCode) => {
    if (code === sede) return;
    Modal.confirm({
      title: "Cambio de Sede",
      content: (
        <p>
          Estás a punto de cambiar tu vista a la sede{" "}
          <strong>{LOCATIONS[code].name}</strong>. Si tienes productos en tu
          carrito, se vaciará. ¿Estás seguro?
        </p>
      ),
      okText: "Sí, cambiar de sede",
      cancelText: "Cancelar",
      centered: true,
      onOk: () => chooseSede(code),
    });
  };

  const {
    loading,
    error,
    page,
    totalPages,
    setPage,
    filteredAndSorted,
    paginatedProducts,
  } = catalog;

  // Infinite Scroll para Mobile
  const handleScroll = useCallback(() => {
    if (window.innerWidth >= 768 || loading) return;

    const scrollHeight = document.documentElement.scrollHeight;
    const currentScroll = window.innerHeight + window.scrollY;

    if (currentScroll + 200 >= scrollHeight && page < totalPages) {
      setPage((prev) => prev + 1);
    }
  }, [loading, page, totalPages, setPage]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Decidimos qué productos mostrar según la plataforma
  const displayProducts =
    window.innerWidth < 768
      ? filteredAndSorted.slice(0, page * 12)
      : paginatedProducts;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <CatalogHeader
        cartCount={cart.cartCount}
        onCartClick={() => cart.setDrawer(true)}
        isCartOpen={cart.drawerOpen}
        closeCart={() => cart.setDrawer(false)}
        sede={sede}
        onSedeChange={handleSedeChange}
      />

      {sede !== null && <CatalogHero sede={activeSede} />}

      <main className="px-4 md:px-8 py-8 pb-32">
        <CatalogToolbar
          search={catalog.search}
          onSearch={catalog.handleSearch}
          onOpenFilters={() => setIsFiltersOpen(true)}
        />

        <div className="flex flex-col md:flex-row gap-10">
          <CatalogSidebar
            categories={catalog.categories}
            selectedCategory={catalog.selectedCategory}
            setSelectedCategory={catalog.setSelectedCategory}
            sortBy={catalog.sortBy}
            setSortBy={catalog.setSortBy}
            hideOutOfStock={catalog.hideOutOfStock}
            setHideOutOfStock={catalog.setHideOutOfStock}
            clearFilters={catalog.clearFilters}
            hasFilters={catalog.hasFilters}
            isOpen={isFiltersOpen}
            onClose={() => setIsFiltersOpen(false)}
          />

          <section className="flex-1">
            <ProductGrid
              loading={loading}
              page={page}
              products={displayProducts}
              cart={cart}
              error={error}
              onRetry={catalog.refreshProducts}
            />

            <div className="mt-10 hidden md:block">
              <CatalogPagination
                page={page}
                totalPages={totalPages}
                setPage={setPage}
              />
            </div>
          </section>
        </div>
      </main>

      <CartDrawer
        isOpen={cart.drawerOpen}
        entries={cart.cartEntries}
        total={cart.cartTotal}
        onClose={() => cart.setDrawer(false)}
        onChangeQty={cart.changeQty}
        onRemove={cart.removeFromCart}
        onCheckout={checkout.handleOpenCheckout}
      />

      <CheckoutModal
        isOpen={checkout.modalOpen}
        status={checkout.status}
        error={checkout.error}
        loadingCons={checkout.loadingCons}
        consumers={checkout.consumers}
        selectedConsumerId={checkout.selectedConsumerId}
        selectedConsumer={checkout.selectedConsumer}
        paymentType={checkout.paymentType}
        paymentMethod={checkout.paymentMethod}
        entries={cart.cartEntries}
        total={cart.cartTotal}
        onClose={checkout.handleCloseModal}
        onConsumerChange={checkout.onConsumerChange}
        onPaymentTypeChange={checkout.setPaymentType}
        onPaymentMethodChange={checkout.setPaymentMethod}
        note={checkout.note}
        onNoteChange={checkout.setNote}
        onConfirm={checkout.handleConfirmPurchase}
        paymentDisplayData={checkout.paymentDisplayData}
        paymentDataLoading={checkout.paymentDataLoading}
        paymentDataError={checkout.paymentDataError}
      />

      <LocationPromptModal open={sede === null} onSelect={chooseSede} />
    </div>
  );
}
