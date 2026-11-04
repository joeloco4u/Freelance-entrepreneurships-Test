import { useEffect, useMemo, useRef, useState } from "react";
import type { LocationCode } from "../config/locations";
import { getCategories } from "../services/categoryService";
import { getActiveProducts } from "../services/productService";
import type { CatalogProduct, Category } from "../types";
import { getErrorMessage } from "../utils/errorMessage";
import { ERROR_MESSAGES } from "../constants/errorMessages";

export type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc";
const PAGE_SIZE = 12;
const EMPTY_PRODUCTS: CatalogProduct[] = [];

export function useCatalog(sede: LocationCode | null) {
  const [remoteProducts, setRemoteProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settledSede, setSettledSede] = useState<LocationCode | null>(null);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [hideOutOfStock, setHideOutOfStock] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const requestIdRef = useRef(0);
  const sedeRef = useRef<LocationCode | null>(sede);

  useEffect(() => {
    sedeRef.current = sede;
  }, [sede]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;

    if (sede === null) {
      // Sin sede no hay catálogo y no se dispara ninguna petición.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRemoteProducts([]);
      setSettledSede(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setError(null);
    setRemoteProducts([]);
    setPage(1);

    const fetchProducts = async () => {
      try {
        const productsData = await getActiveProducts(sede, controller.signal);
        if (requestId !== requestIdRef.current || controller.signal.aborted) {
          return;
        }
        setRemoteProducts(
          productsData.toSorted((a, b) => a.name.localeCompare(b.name)),
        );
        setSettledSede(sede);
        setError(null);
      } catch (err: unknown) {
        if (requestId !== requestIdRef.current || controller.signal.aborted) {
          return;
        }
        // A failed load must not resurrect the previous sede's products:
        // settledSede is set below, which turns off the isStale guard.
        setRemoteProducts([]);
        setSettledSede(sede);
        setError(getErrorMessage(err, ERROR_MESSAGES.products.load));
      } finally {
        if (requestId === requestIdRef.current && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    const fetchCategories = async () => {
      try {
        const categoriesData = await getCategories();
        if (requestId !== requestIdRef.current || controller.signal.aborted) {
          return;
        }
        setCategories(categoriesData);
      } catch {
        // Las categorías son globales: conservamos las últimas cargadas.
      }
    };

    fetchProducts();
    fetchCategories();

    return () => {
      controller.abort();
    };
  }, [sede]);

  const refreshProducts = async () => {
    const targetSede = sedeRef.current;
    if (targetSede === null) return;

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const productsData = await getActiveProducts(targetSede);
      if (requestId !== requestIdRef.current) return;
      setRemoteProducts(
        productsData.toSorted((a, b) => a.name.localeCompare(b.name)),
      );
      setSettledSede(targetSede);
      setError(null);
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) return;
      setSettledSede(targetSede);
      setError(getErrorMessage(err, ERROR_MESSAGES.products.load));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const isStale = sede !== null && sede !== settledSede;
  const products: CatalogProduct[] =
    sede === null || isStale ? EMPTY_PRODUCTS : remoteProducts;
  const visibleLoading = sede === null ? false : isStale ? true : loading;

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
    loading: visibleLoading,
    error: sede === null || isStale ? null : error,
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
