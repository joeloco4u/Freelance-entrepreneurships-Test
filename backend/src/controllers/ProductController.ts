import type { Request, Response } from "express";
import {
  DEFAULT_LOCATION,
  isLocationCode,
  parseLocation,
  type LocationCode,
} from "../config/locations.js";
import { supabaseAdmin } from "../db.js";
import { respondWithError } from "../utils/errors.js";
import { uploadProductImage } from "../services/uploadImageService.js";
import { checkAndNotifyLowStock } from "../services/slackService.js";
import { enrichComposedStock } from "./ComposedProductController.js";

const PRODUCTS_LOAD_ERROR =
  "No se pudieron cargar los productos. Intenta de nuevo más tarde.";

const DELETE_OPTIONS = {
  messages: {
    // foreign_key_violation: the product is referenced by sale_items
    "23503":
      "No puedes eliminar este producto porque ya tiene ventas registradas. Desactívalo en su lugar.",
  },
  fallback: "No se pudo eliminar el producto. Intenta de nuevo más tarde.",
};

type LocationStock = { offered: boolean; stock: number };
type ProductStockRow = { location_id: string; stock: number };

function resolveSede(req: Request, res: Response): LocationCode | null {
  const raw = req.query.sede;
  if (raw === undefined) return DEFAULT_LOCATION;

  const parsed = parseLocation(raw);
  if (!parsed) {
    res.status(400).json({ error: "Sede inválida" });
    return null;
  }
  return parsed;
}

function buildStocks(
  rows: ProductStockRow[] | undefined,
): Record<LocationCode, LocationStock> {
  const stocks: Record<LocationCode, LocationStock> = {
    VF: { offered: false, stock: 0 },
    GO: { offered: false, stock: 0 },
  };

  for (const row of rows ?? []) {
    if (isLocationCode(row.location_id)) {
      stocks[row.location_id] = { offered: true, stock: row.stock };
    }
  }

  return stocks;
}

function stockAtLocation(
  rows: ProductStockRow[] | undefined,
  location: LocationCode,
): number {
  return rows?.find((row) => row.location_id === location)?.stock ?? 0;
}

// [PÚBLICO] Obtener todos los productos activos de emprendimientos activos
export async function getActiveProducts(req: Request, res: Response) {
  const location = resolveSede(req, res);
  if (!location) return;

  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      "*, entrepreneurships!inner(id, name), product_stock!inner(location_id, stock)",
    )
    .eq("is_active", true)
    .eq("entrepreneurships.is_active", true)
    .eq("product_stock.location_id", location);

  if (error)
    return respondWithError(res, error, "getActiveProducts", {
      fallback: PRODUCTS_LOAD_ERROR,
    });

  const enriched = await enrichComposedStock(data ?? [], location);
  const result = enriched.map((p) => {
    const { product_stock: _productStock, ...product } = p;
    return { ...product, current_stock: p.computed_stock ?? 0 };
  });

  res.status(200).json(result);
}

// [ADMIN/IT] Obtener todos los productos
export async function getAllProducts(req: Request, res: Response) {
  const location = resolveSede(req, res);
  if (!location) return;

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*, entrepreneurships(id, name), product_stock(location_id, stock)");

  if (error)
    return respondWithError(res, error, "getAllProducts", {
      fallback: PRODUCTS_LOAD_ERROR,
    });

  const enriched = await enrichComposedStock(data ?? [], location);
  const result = enriched.map((p) => {
    const rows = p.product_stock;
    const { product_stock: _productStock, ...product } = p;
    return {
      ...product,
      current_stock: p.computed_stock ?? stockAtLocation(rows, location),
      stocks: buildStocks(rows),
    };
  });

  res.status(200).json(result);
}

// Obtener todos los productos de un emprendimiento específico
export async function getProductsByEntrepreneurship(
  req: Request,
  res: Response,
) {
  const { entrepreneurship_id } = req.params;
  const requestingUser = req.user;

  const location = resolveSede(req, res);
  if (!location) return;

  if (requestingUser?.user_metadata.roles.includes("PROVEEDOR")) {
    const { data: entrepreneurship } = await supabaseAdmin
      .from("entrepreneurships")
      .select("owner_id")
      .eq("id", entrepreneurship_id)
      .single();

    if (!entrepreneurship) {
      return res.status(404).json({ error: "Emprendimiento no encontrado" });
    }

    if (entrepreneurship.owner_id !== requestingUser?.id) {
      return res.status(403).json({
        error:
          "No tienes permiso para ver los productos de este emprendimiento",
      });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*, product_stock(location_id, stock)")
    .eq("entrepreneurship_id", entrepreneurship_id);

  if (error)
    return respondWithError(res, error, "getProductsByEntrepreneurship", {
      fallback: PRODUCTS_LOAD_ERROR,
    });

  const enriched = await enrichComposedStock(data ?? [], location);
  const result = enriched.map((p) => {
    const rows = p.product_stock;
    const { product_stock: _productStock, ...product } = p;
    return {
      ...product,
      current_stock:
        p.computed_stock ?? stockAtLocation(rows, location) ?? 0,
    };
  });

  res.status(200).json(result);
}

// Obtener un producto por ID
export async function getProductById(req: Request, res: Response) {
  const { id } = req.params;

  const location = resolveSede(req, res);
  if (!location) return;

  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      "*, entrepreneurships(id, name), product_stock(location_id, stock)",
    )
    .eq("id", id)
    .single();

  if (error) return res.status(404).json({ error: "Producto no encontrado" });

  const enriched = await enrichComposedStock([data], location);
  const enrichedProduct = enriched[0];
  if (!enrichedProduct) {
    return res.status(500).json({ error: "Error al procesar el producto" });
  }

  const rows = enrichedProduct.product_stock;
  const { product_stock: _productStock, ...product } = enrichedProduct;
  const result = {
    ...product,
    current_stock:
      enrichedProduct.computed_stock ?? stockAtLocation(rows, location) ?? 0,
  };

  res.status(200).json(result);
}

// [PROVEEDOR] Crear un producto
export async function createProduct(req: Request, res: Response) {
  const requestingUser = req.user;
  const imageFile = req.file;

  // 1. Extracción y conversión de tipos (FormData envía strings)
  const { entrepreneurship_id, name, is_active, category_id } = req.body;
  const price = parseFloat(req.body.price);
  const current_stock = parseInt(req.body.current_stock, 10);

  // 2. Validación de campos obligatorios
  if (
    !entrepreneurship_id ||
    !name ||
    Number.isNaN(price) ||
    price < 0 ||
    Number.isNaN(current_stock) ||
    current_stock < 0
  ) {
    return res.status(400).json({
      error:
        "Los campos entrepreneurship_id, name, price y current_stock son obligatorios y deben ser válidos",
    });
  }

  try {
    // 3. Verificamos que el emprendimiento exista y pertenezca al usuario
    const { data: entrepreneurship, error: entError } = await supabaseAdmin
      .from("entrepreneurships")
      .select("owner_id")
      .eq("id", entrepreneurship_id)
      .single();

    if (entError || !entrepreneurship) {
      return res.status(404).json({ error: "Emprendimiento no encontrado" });
    }

    if (entrepreneurship.owner_id !== requestingUser?.id) {
      return res.status(403).json({
        error: "No tienes permiso para agregar productos a este emprendimiento",
      });
    }

    // 4. Lógica de subida de imagen al Storage
    let imageUrl: string | null = null;
    if (imageFile) {
      // Normalizamos el nombre del archivo para evitar caracteres extraños en la URL
      const cleanName = name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const fileName = `${Date.now()}-${cleanName}`;
      const path = `${entrepreneurship_id}/${fileName}`;

      imageUrl = await uploadProductImage(imageFile, path);
    }

    // 5. Inserción en la base de datos
    const { data: newProduct, error: insertError } = await supabaseAdmin
      .from("products")
      .insert({
        entrepreneurship_id,
        name,
        price,
        current_stock,
        image: imageUrl, // Usamos la URL generada por el Storage
        is_active: is_active === "true" || is_active === true, // Manejo de booleano desde FormData
        category_id: category_id ? parseInt(category_id, 10) : null,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    if (!newProduct) throw new Error("No se pudo crear el producto");

    // 6. Asociar el producto a la sede por defecto (puente temporal)
    const { error: stockError } = await supabaseAdmin
      .from("product_stock")
      .insert({
        product_id: newProduct.id,
        location_id: DEFAULT_LOCATION,
        stock: current_stock,
      });

    if (stockError) {
      await supabaseAdmin.from("products").delete().eq("id", newProduct.id);
      throw stockError;
    }

    // 7. Respuesta exitosa
    return res.status(201).json(newProduct);
  } catch (error: unknown) {
    return respondWithError(res, error, "createProduct", {
      status: 400,
      fallback:
        "No se pudo crear el producto. Verifica los datos e intenta de nuevo.",
    });
  }
}

// Actualizar un producto
export async function updateProduct(req: Request, res: Response) {
  const { id } = req.params;
  const requestingUser = req.user;
  const imageFile = req.file;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: "ID de producto inválido" });
  }

  try {
    // 1. Verificar existencia del producto y permisos de dueño
    const { data: product, error: fetchError } = await supabaseAdmin
      .from("products")
      .select("*, entrepreneurships(owner_id)")
      .eq("id", id)
      .single();

    if (fetchError || !product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    // El PROVEEDOR solo puede editar sus propios productos
    const roles: string[] = requestingUser?.user_metadata?.roles ?? [];
    if (roles.includes("PROVEEDOR")) {
      if (product.entrepreneurships.owner_id !== requestingUser?.id) {
        return res
          .status(403)
          .json({ error: "No tienes permiso para editar este producto" });
      }
    }

    // 2. Preparar el objeto de actualización con whitelist de campos
    const allowedFields = ["name", "price", "current_stock", "is_active", "category_id"] as const;
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.price !== undefined) updates.price = parseFloat(updates.price as string);
    if (updates.current_stock !== undefined) {
      updates.current_stock = parseInt(updates.current_stock as string, 10);
      if (!Number.isInteger(updates.current_stock) || (updates.current_stock as number) < 0) {
        return res.status(400).json({
          error: "El stock debe ser un entero mayor o igual a 0",
        });
      }
    }
    if (updates.is_active !== undefined) {
      updates.is_active =
        updates.is_active === "true" || updates.is_active === true;
    }
    if (updates.category_id !== undefined) {
      updates.category_id = parseInt(updates.category_id as string, 10);
    }

    // 3. Manejo de la nueva imagen (si se subió una)
    if (imageFile) {
      const fileName = `${Date.now()}-${id}`;
      const path = `${product.entrepreneurship_id}/${fileName}`;
      updates.image = await uploadProductImage(imageFile, path);
    }

    // 5. Ejecutar la actualización
    const { data: updatedProduct, error: updateError } = await supabaseAdmin
      .from("products")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    if (updates.current_stock !== undefined) {
      const newStock = updates.current_stock as number;

      const { error: stockError } = await supabaseAdmin
        .from("product_stock")
        .upsert(
          {
            product_id: id,
            location_id: DEFAULT_LOCATION,
            stock: newStock,
          },
          { onConflict: "product_id,location_id" },
        );

      if (stockError) throw stockError;

      try {
        await checkAndNotifyLowStock([
          { product_id: id, new_stock: newStock, location_id: DEFAULT_LOCATION },
        ]);
      } catch (stockErr) {
        console.error("Error checking low stock:", stockErr);
      }
    }

    return res.status(200).json({
      message: "Producto actualizado correctamente",
      data: updatedProduct,
    });
  } catch (error: unknown) {
    return respondWithError(res, error, "updateProduct", {
      status: 400,
      fallback:
        "No se pudo actualizar el producto. Verifica los datos e intenta de nuevo.",
    });
  }
}

// Eliminar un producto
export async function deleteProduct(req: Request, res: Response) {
  const { id } = req.params;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "ID de producto inválido o ausente" });
  }

  try {
    const { error } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("id", id);

    if (error)
      return respondWithError(res, error, "deleteProduct", DELETE_OPTIONS);
    res.status(200).json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    return respondWithError(res, error, "deleteProduct", DELETE_OPTIONS);
  }
}
