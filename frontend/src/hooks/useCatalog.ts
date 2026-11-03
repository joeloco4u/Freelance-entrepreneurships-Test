import { useEffect, useMemo, useState } from "react";
import { getCategories } from "../services/categoryService";
import { getActiveProducts } from "../services/productService";
import type { CatalogProduct, Category } from "../types";
import { getErrorMessage } from "../utils/errorMessage";
import { ERROR_MESSAGES } from "../constants/errorMessages";

export type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc";
const PAGE_SIZE = 12;

export function useCatalog() {
  const [remoteProducts, setRemoteProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [hideOutOfStock, setHideOutOfStock] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const products: CatalogProduct[] = remoteProducts;

  useEffect(() => {
    let cancelled = false;

    Promise.all([getActiveProducts(), getCategories()])
      .then(([productsData, categoriesData]) => {
        if (cancelled) return;
        setRemoteProducts(
          productsData.toSorted((a, b) => a.name.localeCompare(b.name)),
        );
        setCategories(categoriesData);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          getErrorMessage(err, ERROR_MESSAGES.products.load),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshProducts = async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        getActiveProducts(),
        getCategories(),
      ]);
      setRemoteProducts(
        productsData.toSorted((a, b) => a.name.localeCompare(b.name)),
      );
      setCategories(categoriesData);
      setError(null);
    } catch (err: unknown) {
      setError(
        getErrorMessage(err, ERROR_MESSAGES.products.load),
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    const result = products.filter(
      (p) =>
        (p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.entrepreneurships.name
            .toLowerCase()
            .includes(search.toLowerCase())) &&
        (!hideOutOfStock || p.current_stock > 0) &&
        (!selectedCategory || p.category_id === Number(selectedCategory)),
    );

    return result.toSorted((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        default:
          return 0;
      }
    });
  }, [products, search, sortBy, hideOutOfStock, selectedCategory]);

  const totalPages = Math.ceil(filteredAndSorted.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(totalPages, 1));
  const paginatedProducts = filteredAndSorted.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setSortBy("name-asc");
    setHideOutOfStock(false);
    setSelectedCategory(null);
    setPage(1);
  };

  return {
    allProducts: products,
    categories,
    paginatedProducts,
    filteredAndSorted,
    refreshProducts,
    loading,
    error,
    page: safePage,
    totalPages,
    setPage,
    search,
    handleSearch,
    sortBy,
    setSortBy,
    hideOutOfStock,
    setHideOutOfStock,
    selectedCategory,
    setSelectedCategory,
    clearFilters,
    hasFilters:
      search !== "" ||
      sortBy !== "name-asc" ||
      hideOutOfStock ||
      selectedCategory !== null,
  };
}
