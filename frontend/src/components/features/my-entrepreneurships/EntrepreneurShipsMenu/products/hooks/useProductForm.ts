import { useState } from "react";
import {
  DEFAULT_LOCATION,
  getDefaultProductStocks,
  type LocationCode,
  type LocationStock,
  type ProductStocks,
} from "../../../../../../config/locations";
import { MAX_STOCK } from "../../../../../../constants/stock";
import type {
  EntrepreneurshipProduct,
  ProductInput,
} from "../../../../../../types";

const clampStock = (value: number) =>
  Math.min(
    MAX_STOCK,
    Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0)),
  );

const buildInitialStocks = (
  product: EntrepreneurshipProduct | null,
): ProductStocks => {
  const fallback = getDefaultProductStocks(product?.current_stock ?? 0);
  const incoming = product?.stocks;

  return {
    VF: {
      offered: incoming?.VF.offered ?? fallback.VF.offered,
      stock: clampStock(incoming?.VF.stock ?? fallback.VF.stock),
    },
    GO: {
      offered: incoming?.GO.offered ?? fallback.GO.offered,
      stock: clampStock(incoming?.GO.stock ?? fallback.GO.stock),
    },
  };
};

type UpdatableProductField = Exclude<
  keyof ProductInput,
  "stocks" | "current_stock"
>;

export function useProductForm(product: EntrepreneurshipProduct | null) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<ProductInput>(() => {
    const stocks = buildInitialStocks(product);

    return {
      name: product?.name || "",
      price: product?.price || 0,
      current_stock: stocks[DEFAULT_LOCATION].offered
        ? stocks[DEFAULT_LOCATION].stock
        : undefined,
      is_active: product?.is_active ?? true,
      image: product?.image || "",
      category_id: product?.category_id,
      stocks,
    };
  });

  const updateField = <K extends UpdatableProductField>(
    field: K,
    value: ProductInput[K],
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateStock = (
    location: LocationCode,
    patch: Partial<LocationStock>,
  ) => {
    setFormData((prev) => {
      const stocks =
        prev.stocks ?? getDefaultProductStocks(prev.current_stock ?? 0);
      const nextCell = { ...stocks[location], ...patch };
      const stock = clampStock(nextCell.stock);
      const nextStocks = {
        ...stocks,
        [location]: { ...nextCell, stock },
      };

      return {
        ...prev,
        stocks: nextStocks,
        current_stock: nextStocks[DEFAULT_LOCATION].offered
          ? nextStocks[DEFAULT_LOCATION].stock
          : undefined,
      };
    });
  };

  return {
    formData,
    selectedFile,
    setSelectedFile,
    updateField,
    updateStock,
  };
}
