import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  getDefaultProductStocks,
  LOCATION_CODES,
  type LocationCode,
  type ProductStocks,
} from "../config/locations";
import {
  getEntrepreneurshipProducts,
  updateProductStockMatrix,
} from "../services/productService";
import type {
  EntrepreneurshipProduct,
  StockMatrixItem,
} from "../types";
import { getErrorMessage } from "../utils/errorMessage";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import {
  MAX_STOCK,
  MAX_STOCK_MATRIX_ITEMS,
} from "../constants/stock";

function cloneProductStocks(stocks: ProductStocks): ProductStocks {
  return {
    VF: { ...stocks.VF },
    GO: { ...stocks.GO },
  };
}

function cloneStocksMap(
  source: Record<string, ProductStocks>,
): Record<string, ProductStocks> {
  const next: Record<string, ProductStocks> = {};
  for (const [productId, stocks] of Object.entries(source)) {
    next[productId] = cloneProductStocks(stocks);
  }
  return next;
}

function buildStocksMap(
  products: EntrepreneurshipProduct[],
): Record<string, ProductStocks> {
  const next: Record<string, ProductStocks> = {};
  for (const product of products) {
    next[product.id] = cloneProductStocks(
      product.stocks ?? getDefaultProductStocks(product.current_stock),
    );
  }
  return next;
}

function stocksEqual(a: ProductStocks, b: ProductStocks): boolean {
  return LOCATION_CODES.every(
    (location) =>
      a[location].offered === b[location].offered &&
      a[location].stock === b[location].stock,
  );
}

export function useStockMatrix(entrepreneurshipId?: string, enabled = true) {
  const [products, setProducts] = useState<EntrepreneurshipProduct[]>([]);
  const [composedCount, setComposedCount] = useState(0);
  const [draft, setDraft] = useState<Record<string, ProductStocks>>({});
  const [baseline, setBaseline] = useState<Record<string, ProductStocks>>({});
  const [loading, setLoading] = useState(
    () => Boolean(entrepreneurshipId) && enabled,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const savingRef = useRef(false);

  useEffect(() => {
    const currentId = entrepreneurshipId;
    if (!enabled || !currentId) return;

    const controller = new AbortController();
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      setProducts([]);
      setDraft({});
      setBaseline({});
      setComposedCount(0);

      try {
        const data = await getEntrepreneurshipProducts(
          currentId,
          controller.signal,
        );

        if (cancelled || controller.signal.aborted) return;

        const simple = data.filter((product) => !product.is_composed);
        setProducts(simple);
        setComposedCount(data.length - simple.length);

        const next = buildStocksMap(simple);
        setDraft(next);
        setBaseline(cloneStocksMap(next));
      } catch (loadError: unknown) {
        if (cancelled || controller.signal.aborted) return;

        console.error("[useStockMatrix] load:", loadError);
        setError(getErrorMessage(loadError, ERROR_MESSAGES.products.load));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, entrepreneurshipId, reloadKey]);

  const toggleOffered = useCallback(
    (productId: string, location: LocationCode, offered: boolean) => {
      setDraft((prev) => {
        const current = prev[productId];
        if (!current) return prev;

        return {
          ...prev,
          [productId]: {
            ...current,
            [location]: { ...current[location], offered },
          },
        };
      });
    },
    [],
  );

  const setStock = useCallback(
    (productId: string, location: LocationCode, stock: number) => {
      const safeStock = Math.min(
        MAX_STOCK,
        Math.max(0, Math.trunc(Number.isFinite(stock) ? stock : 0)),
      );

      setDraft((prev) => {
        const current = prev[productId];
        if (!current) return prev;

        return {
          ...prev,
          [productId]: {
            ...current,
            [location]: { ...current[location], stock: safeStock },
          },
        };
      });
    },
    [],
  );

  const dirtyCount = useMemo(() => {
    let count = 0;

    for (const product of products) {
      const current = draft[product.id];
      const original = baseline[product.id];
      if (!current || !original) continue;

      const changed = LOCATION_CODES.some(
        (location) =>
          current[location].offered !== original[location].offered ||
          current[location].stock !== original[location].stock,
      );

      if (changed) count += 1;
    }

    return count;
  }, [products, draft, baseline]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!entrepreneurshipId) return false;
    if (savingRef.current) return false;

    const items: StockMatrixItem[] = [];

    for (const product of products) {
      const current = draft[product.id];
      const original = baseline[product.id];
      if (!current || !original) continue;

      if (!stocksEqual(current, original)) {
        items.push({
          product_id: product.id,
          stocks: cloneProductStocks(current),
        });
      }
    }

    if (items.length === 0) return false;

    if (items.length > MAX_STOCK_MATRIX_ITEMS) {
      toast.error(ERROR_MESSAGES.products.stockMatrixLimit);
      return false;
    }

    const snapshot = cloneStocksMap(draft);

    savingRef.current = true;
    setIsSaving(true);
    try {
      await updateProductStockMatrix({
        entrepreneurship_id: entrepreneurshipId,
        items,
      });

      toast.success("Stock actualizado correctamente");
      setBaseline(cloneStocksMap(snapshot));
      return true;
    } catch (saveError: unknown) {
      console.error("[useStockMatrix] save:", saveError);
      toast.error(getErrorMessage(saveError, ERROR_MESSAGES.products.stockMatrix));
      return false;
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [baseline, draft, entrepreneurshipId, products]);

  const reload = useCallback(() => {
    if (savingRef.current) return;
    setReloadKey((key) => key + 1);
  }, []);

  return {
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
  };
}
