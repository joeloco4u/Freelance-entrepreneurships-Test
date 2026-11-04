import api from "../config/api";
import type { LocationCode } from "../config/locations";
import type {
  CatalogProduct,
  EntrepreneurshipProduct,
  ProductInput,
} from "../types";

/**
 * Función auxiliar para convertir ProductInput a FormData
 */
const prepareFormData = (data: Partial<ProductInput>) => {
  const formData = new FormData();

  // Recorremos los campos y los agregamos al FormData
  // Nota: Los valores numéricos y booleanos se convierten a string automáticamente en FormData
  if (data.name) formData.append("name", data.name);
  if (data.price != null) formData.append("price", data.price.toString());
  if (data.current_stock != null)
    formData.append("current_stock", data.current_stock.toString());
  if (data.is_active !== undefined)
    formData.append("is_active", String(data.is_active));
  if (data.entrepreneurship_id)
    formData.append("entrepreneurship_id", data.entrepreneurship_id);
  if (data.category_id != null)
    formData.append("category_id", data.category_id.toString());

  // El archivo debe ir con la clave "image" para que coincida con upload.single("image") del backend
  if (data.imageFile) {
    formData.append("image", data.imageFile);
  }

  return formData;
};

export const createProduct = async (
  data: ProductInput,
): Promise<CatalogProduct> => {
  const formData = prepareFormData(data);

  const response = await api.post(`/products/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateProduct = async (
  productId: string,
  data: Partial<ProductInput>,
): Promise<EntrepreneurshipProduct> => {
  const formData = prepareFormData(data);

  const response = await api.put(`/products/${productId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

// Estas funciones se mantienen igual ya que no envían archivos
export async function getActiveProducts(
  sede: LocationCode,
  signal?: AbortSignal,
): Promise<CatalogProduct[]> {
  const { data } = await api.get<CatalogProduct[]>("/products/public", {
    params: { sede },
    signal,
  });
  return data;
}

export async function getEntrepreneurshipProducts(
  entrepreneurshipId: string,
): Promise<EntrepreneurshipProduct[]> {
  const { data } = await api.get<EntrepreneurshipProduct[]>(
    `/products/entrepreneurship/${entrepreneurshipId}`,
  );
  return data;
}

export const deleteProduct = async (productId: string): Promise<void> => {
  await api.delete(`/products/${productId}`);
};
