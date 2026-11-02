import { useState } from "react";
import {
  getDefaultProductStocks,
  type LocationCode,
  type LocationStock,
} from "../../../../../../config/locations";
import type {
  EntrepreneurshipProduct,
  ProductInput,
} from "../../../../../../types";

export function useProductForm(product: EntrepreneurshipProduct | null) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<ProductInput>({
    name: product?.name || "",
    price: product?.price || 0,
    current_stock: product?.current_stock || 0,
    is_active: product?.is_active ?? true,
    image: product?.image || "",
    category_id: product?.category_id,
    stocks: product?.stocks ?? getDefaultProductStocks(product?.current_stock ?? 0),
  });

  const updateField = <K extends keyof ProductInput>(
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
      const stocks = prev.stocks ?? getDefaultProductStocks(prev.current_stock);
      return {
        ...prev,
        stocks: {
          ...stocks,
          [location]: { ...stocks[location], ...patch },
        },
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
