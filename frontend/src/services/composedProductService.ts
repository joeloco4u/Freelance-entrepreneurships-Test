import api from "../config/api";
import type {
  CatalogProduct,
  ComposedProductInput,
  EntrepreneurshipProduct,
} from "../types";

const prepareFormData = (data: ComposedProductInput) => {
  const formData = new FormData();

  if (data.name) formData.append("name", data.name);
  if (data.price != null)
    formData.append("price", data.price.toString());
  if (data.is_active !== undefined)
    formData.append("is_active", String(data.is_active));
  if (data.entrepreneurship_id)
    formData.append("entrepreneurship_id", data.entrepreneurship_id);
  if (data.category_id != null)
    formData.append("category_id", data.category_id.toString());
  if (data.components)
    formData.append("components", JSON.stringify(data.components));

  if (data.imageFile) {
    formData.append("image", data.imageFile);
  }

  return formData;
};

export const createComposedProduct = async (
  data: ComposedProductInput,
): Promise<CatalogProduct> => {
  const formData = prepareFormData(data);
  const response = await api.post("/composed-products", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateComposedProduct = async (
  productId: string,
  data: Partial<ComposedProductInput>,
): Promise<EntrepreneurshipProduct> => {
  const formData = new FormData();
  if (data.name) formData.append("name", data.name);
  if (data.price != null)
    formData.append("price", data.price.toString());
  if (data.is_active !== undefined)
    formData.append("is_active", String(data.is_active));
  if (data.category_id != null)
    formData.append("category_id", data.category_id.toString());
  if (data.components)
    formData.append("components", JSON.stringify(data.components));
  if (data.imageFile) formData.append("image", data.imageFile);

  const response = await api.put(`/composed-products/${productId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const getComposedProductsByEntrepreneurship = async (
  entrepreneurshipId: string,
): Promise<EntrepreneurshipProduct[]> => {
  const { data } = await api.get(
    `/composed-products/entrepreneurship/${entrepreneurshipId}`,
  );
  return data;
};

export const getComposedProductById = async (id: string) => {
  const { data } = await api.get(`/composed-products/${id}`);
  return data;
};

export const deleteComposedProduct = async (productId: string) => {
  await api.delete(`/composed-products/${productId}`);
};
