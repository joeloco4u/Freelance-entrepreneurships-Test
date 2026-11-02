import { useMemo, useState } from "react";
import { getDefaultProductStocks } from "../../../../../../config/locations";
import type {
  ComposedProductComponent,
  ComposedProductInput,
} from "../../../../../../types";

function buildFormData(
  product: (ComposedProductInput & { id?: string }) | null,
): ComposedProductInput {
  return {
    name: product?.name || "",
    price: product?.price || 0,
    is_active: product?.is_active ?? true,
    entrepreneurship_id: product?.entrepreneurship_id || "",
    image: product?.image || "",
    category_id: product?.category_id,
    components: product?.components || [],
    stocks: product?.stocks ?? getDefaultProductStocks(0),
  };
}

export function useComposedProductForm(
  product: (ComposedProductInput & { id?: string }) | null,
) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dirtyFields, setDirtyFields] = useState<Partial<ComposedProductInput>>(
    {},
  );

  const formData = useMemo(() => {
    return { ...buildFormData(product), ...dirtyFields };
  }, [product, dirtyFields]);

  const setFormData = (data: ComposedProductInput) => {
    setDirtyFields(data);
  };

  const updateField = <K extends keyof ComposedProductInput>(
    field: K,
    value: ComposedProductInput[K],
  ) => {
    setFormData({ ...formData, [field]: value });
  };

  const addComponent = (component: ComposedProductComponent) => {
    setFormData({
      ...formData,
      components: [...formData.components, component],
    });
  };

  const removeComponent = (index: number) => {
    setFormData({
      ...formData,
      components: formData.components.filter((_, i) => i !== index),
    });
  };

  const updateComponent = (
    index: number,
    field: keyof ComposedProductComponent,
    value: string | number,
  ) => {
    setFormData({
      ...formData,
      components: formData.components.map((c, i) =>
        i === index ? { ...c, [field]: value } : c,
      ),
    });
  };

  return {
    formData,
    selectedFile,
    setSelectedFile,
    updateField,
    addComponent,
    removeComponent,
    updateComponent,
  };
}
