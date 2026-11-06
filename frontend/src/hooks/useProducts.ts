import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  createComposedProduct,
  deleteComposedProduct,
  getComposedProductById,
  updateComposedProduct,
} from "../services/composedProductService";
import {
  createProduct,
  deleteProduct,
  getEntrepreneurshipProducts,
  updateProduct,
} from "../services/productService";
import type {
  ComposedProductInput,
  EntrepreneurshipProduct,
  ProductInput,
} from "../types";
import { getErrorMessage } from "../utils/errorMessage";
import { ERROR_MESSAGES } from "../constants/errorMessages";

function isComposedInput(
  data: ProductInput | ComposedProductInput,
): data is ComposedProductInput {
  return "components" in data;
}

export function useProducts(entrepreneurshipId?: string) {
  const [products, setProducts] = useState<EntrepreneurshipProduct[]>([]);
  const [loading, setLoading] = useState(() => Boolean(entrepreneurshipId));
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  const [formModal, setFormModal] = useState<{
    isOpen: boolean;
    product?: EntrepreneurshipProduct;
    composedData?: ComposedProductInput;
  }>({ isOpen: false });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
  }>({
    isOpen: false,
    id: "",
    name: "",
  });

  const loadProducts = useCallback(
    async (options: { showSkeleton: boolean; notifyError: boolean }) => {
      if (!entrepreneurshipId) return;

      try {
        if (options.showSkeleton) setLoading(true);
        const data = await getEntrepreneurshipProducts(entrepreneurshipId);
        setProducts(data);
      } catch (error) {
        console.error(error);
        if (options.notifyError) {
          toast.error(getErrorMessage(error, ERROR_MESSAGES.products.load));
        } else {
          toast.warn(ERROR_MESSAGES.products.refreshAfterStock);
        }
      } finally {
        if (options.showSkeleton) setLoading(false);
      }
    },
    [entrepreneurshipId],
  );

  const fetchProducts = useCallback(
    () => loadProducts({ showSkeleton: true, notifyError: true }),
    [loadProducts],
  );

  const refreshProducts = useCallback(
    () => loadProducts({ showSkeleton: false, notifyError: false }),
    [loadProducts],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!entrepreneurshipId) return;

      try {
        setLoading(true);
        const data = await getEntrepreneurshipProducts(entrepreneurshipId);
        if (!cancelled) setProducts(data);
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          const errorMessage =
            getErrorMessage(error, ERROR_MESSAGES.products.load);
          toast.error(errorMessage);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [entrepreneurshipId]);

  const saveProduct = async (
    data: ProductInput | ComposedProductInput,
  ) => {
    if (!entrepreneurshipId) return;

    setIsSaving(true);
    try {
      if (formModal.product?.id) {
        if (isComposedInput(data)) {
          await updateComposedProduct(formModal.product.id, data);
          toast.success("Combo actualizado correctamente");
        } else {
          await updateProduct(formModal.product.id, data);
          toast.success("Producto actualizado correctamente");
        }
      } else {
        if (isComposedInput(data)) {
          await createComposedProduct(data);
          toast.success("Combo creado correctamente");
        } else {
          await createProduct(data);
          toast.success("Producto creado correctamente");
        }
      }

      await fetchProducts();
      setFormModal({ isOpen: false });
    } catch (error) {
      console.error(error);
      const errorMessage =
        getErrorMessage(error, ERROR_MESSAGES.products.save);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const openFormModal = useCallback((product?: EntrepreneurshipProduct) => {
    setFormModal({ isOpen: true, product });

    if (product?.is_composed) {
      getComposedProductById(product.id).then((data) => {
        setFormModal((prev) => {
          if (!prev.isOpen || prev.product?.id !== product.id) return prev;
          return {
            ...prev,
            composedData: {
              name: data.name,
              price: data.price,
              is_active: data.is_active,
              entrepreneurship_id: data.entrepreneurship_id,
              image: data.image,
              category_id: data.category_id,
              components: (data.components || []).map(
                (c: { component_product_id: string; quantity: number }) => ({
                  component_product_id: c.component_product_id,
                  quantity: c.quantity,
                }),
              ),
            },
          };
        });
      })
      .catch((error: unknown) => {
        console.error("[useProducts] getComposedProductById:", error);
        toast.error(getErrorMessage(error, ERROR_MESSAGES.products.loadCombo));
      });
    }
  }, []);

  const closeFormModal = useCallback(() => {
    setFormModal({ isOpen: false });
  }, []);

  const openDeleteModal = (id: string, name: string) =>
    setDeleteModal({ isOpen: true, id, name });
  const closeDeleteModal = () =>
    setDeleteModal({ isOpen: false, id: "", name: "" });

  const confirmDelete = async () => {
    setIsSaving(true);
    try {
      const product = products.find((p) => p.id === deleteModal.id);
      if (product?.is_composed) {
        await deleteComposedProduct(deleteModal.id);
        toast.success("Combo eliminado");
      } else {
        await deleteProduct(deleteModal.id);
        toast.success("Producto eliminado");
      }
      fetchProducts();
      closeDeleteModal();
    } catch (error) {
      const errorMessage =
        getErrorMessage(error, ERROR_MESSAGES.products.delete);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (statusFilter !== "all") {
      const isActive = statusFilter === "active";
      result = result.filter((p) => p.is_active === isActive);
    }

    if (stockFilter === "low-stock") {
      result = result.filter((p) => p.current_stock < 5);
    } else if (stockFilter === "normal-stock") {
      result = result.filter((p) => p.current_stock >= 5);
    }

    result = result.toSorted((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "stock-asc":
          return a.current_stock - b.current_stock;
        case "stock-desc":
          return b.current_stock - a.current_stock;
        default:
          return 0;
      }
    });

    return result;
  }, [products, searchQuery, sortBy, statusFilter, stockFilter]);

  return {
    products: filteredProducts,
    allProducts: products,
    allProductsCount: products.length,
    loading,
    isSaving,
    formModal,
    deleteModal,
    openFormModal,
    closeFormModal,
    openDeleteModal,
    closeDeleteModal,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    statusFilter,
    setStatusFilter,
    stockFilter,
    setStockFilter,
    saveProduct,
    confirmDelete,
    fetchProducts,
    refreshProducts,
  };
}
