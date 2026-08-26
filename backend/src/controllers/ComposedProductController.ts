import type { Request, Response } from "express";
import { supabaseAdmin } from "../db.js";
import { uploadProductImage } from "../services/uploadImageService.js";
import { respondWithError } from "../utils/errors.js";

const DELETE_OPTIONS = {
  messages: {
    // foreign_key_violation: the combo is referenced by sale_items
    "23503":
      "No puedes eliminar este combo porque ya tiene ventas registradas. Desactívalo en su lugar.",
  },
  fallback: "No se pudo eliminar el combo. Intenta de nuevo más tarde.",
};

// Obtener todos los productos compuestos de un emprendimiento (con stock calculado)
export async function getComposedProductsByEntrepreneurship(
  req: Request,
  res: Response,
) {
  const { entrepreneurship_id } = req.params;
  const requestingUser = req.user;

  if (requestingUser?.user_metadata.roles.includes("PROVEEDOR")) {
    const { data: entrepreneurship } = await supabaseAdmin
      .from("entrepreneurships")
      .select("owner_id")
      .eq("id", entrepreneurship_id)
      .single();

    if (!entrepreneurship) {
      return res.status(404).json({ error: "Emprendimiento no encontrado" });
    }

    if (entrepreneurship.owner_id !== requestingUser.id) {
      return res.status(403).json({
        error:
          "No tienes permiso para ver los productos de este emprendimiento",
      });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("entrepreneurship_id", entrepreneurship_id)
    .eq("is_composed", true);

  if (error)
    return respondWithError(res, error, "getComposedProducts", {
      fallback: "No se pudieron cargar los combos. Intenta de nuevo más tarde.",
    });

  const enriched = await enrichComposedStock(data);
  res.status(200).json(enriched);
}

// Obtener un producto compuesto con sus componentes
export async function getComposedProductById(req: Request, res: Response) {
  const { id } = req.params;

  const { data: product, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("is_composed", true)
    .single();

  if (error || !product) {
    return res.status(404).json({ error: "Producto compuesto no encontrado" });
  }

  const { data: components } = await supabaseAdmin
    .from("composed_product_components")
    .select("*, component_product:component_product_id(id, name, price, current_stock, image)")
    .eq("composed_product_id", id);

  const enriched = await enrichComposedStock([product]);
  res.status(200).json({ ...enriched[0], components: components || [] });
}

// Crear un producto compuesto
export async function createComposedProduct(req: Request, res: Response) {
  const requestingUser = req.user;
  const imageFile = req.file;

  const { entrepreneurship_id, name, is_active, category_id, components } =
    req.body;
  const price = parseFloat(req.body.price);

  if (!entrepreneurship_id || !name || Number.isNaN(price) || !components) {
    return res.status(400).json({
      error:
        "Los campos entrepreneurship_id, name, price y components son obligatorios",
    });
  }

  let parsedComponents: { component_product_id: string; quantity: number }[];
  try {
    parsedComponents =
      typeof components === "string" ? JSON.parse(components) : components;
  } catch {
    return res.status(400).json({ error: "components debe ser un JSON válido" });
  }

  if (!Array.isArray(parsedComponents) || parsedComponents.length === 0) {
    return res.status(400).json({
      error: "Debe incluir al menos un componente",
    });
  }

  try {
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
        error:
          "No tienes permiso para agregar productos a este emprendimiento",
      });
    }

    let imageUrl: string | null = null;
    if (imageFile) {
      const cleanName = name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const fileName = `${Date.now()}-${cleanName}`;
      const path = `${entrepreneurship_id}/${fileName}`;
      imageUrl = await uploadProductImage(imageFile, path);
    }

    const { data: newProduct, error: insertError } = await supabaseAdmin
      .from("products")
      .insert({
        entrepreneurship_id,
        name,
        price,
        current_stock: 0,
        image: imageUrl,
        is_active: is_active === "true" || is_active === true,
        category_id: category_id ? parseInt(category_id, 10) : null,
        is_composed: true,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    if (!newProduct) throw new Error("No se pudo crear el producto compuesto");

    const componentsToInsert = parsedComponents.map((c) => ({
      composed_product_id: newProduct.id,
      component_product_id: c.component_product_id,
      quantity: c.quantity,
    }));

    const { error: compError } = await supabaseAdmin
      .from("composed_product_components")
      .insert(componentsToInsert);

    if (compError) throw compError;

    const enriched = await enrichComposedStock([newProduct]);
    return res.status(201).json(enriched[0]);
  } catch (error: unknown) {
    return respondWithError(res, error, "createComposedProduct", {
      status: 400,
      fallback:
        "No se pudo crear el combo. Verifica los datos e intenta de nuevo.",
    });
  }
}

// Actualizar un producto compuesto
export async function updateComposedProduct(req: Request, res: Response) {
  const { id } = req.params;
  const requestingUser = req.user;
  const imageFile = req.file;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: "ID de producto inválido" });
  }

  try {
    const { data: product, error: fetchError } = await supabaseAdmin
      .from("products")
      .select("*, entrepreneurships(owner_id)")
      .eq("id", id)
      .eq("is_composed", true)
      .single();

    if (fetchError || !product) {
      return res.status(404).json({ error: "Producto compuesto no encontrado" });
    }

    if (requestingUser?.user_metadata.roles.includes("PROVEEDOR")) {
      if (product.entrepreneurships.owner_id !== requestingUser.id) {
        return res
          .status(403)
          .json({ error: "No tienes permiso para editar este producto" });
      }
    }

    const updates: Record<string, unknown> = { ...req.body };
    if (updates.price) updates.price = parseFloat(updates.price as string);
    if (updates.is_active !== undefined) {
      updates.is_active =
        updates.is_active === "true" || updates.is_active === true;
    }
    if (updates.category_id) {
      updates.category_id = parseInt(updates.category_id as string, 10);
    }

    if (imageFile) {
      const fileName = `${Date.now()}-${id}`;
      const path = `${product.entrepreneurship_id}/${fileName}`;
      updates.image = await uploadProductImage(imageFile, path);
    }

    delete updates.entrepreneurships;
    delete updates.entrepreneurship_id;
    delete updates.components;
    delete updates.is_composed;

    const { data: updatedProduct, error: updateError } = await supabaseAdmin
      .from("products")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;
    if (!updatedProduct) throw new Error("No se pudo actualizar el producto compuesto");

    // Si hay components en el body, actualizarlos
    if (req.body.components) {
      let parsedComponents: { component_product_id: string; quantity: number }[];
      try {
        parsedComponents =
          typeof req.body.components === "string"
            ? JSON.parse(req.body.components)
            : req.body.components;
      } catch {
        return res.status(400).json({ error: "components debe ser un JSON válido" });
      }

      if (Array.isArray(parsedComponents)) {
        await supabaseAdmin
          .from("composed_product_components")
          .delete()
          .eq("composed_product_id", id);

        if (parsedComponents.length > 0) {
          const componentsToInsert = parsedComponents.map((c) => ({
            composed_product_id: id,
            component_product_id: c.component_product_id,
            quantity: c.quantity,
          }));

          const { error: compError } = await supabaseAdmin
            .from("composed_product_components")
            .insert(componentsToInsert);

          if (compError) throw compError;
        }
      }
    }

    const enriched = await enrichComposedStock([updatedProduct]);
    return res.status(200).json(enriched[0]);
  } catch (error: unknown) {
    return respondWithError(res, error, "updateComposedProduct", {
      status: 400,
      fallback:
        "No se pudo actualizar el combo. Verifica los datos e intenta de nuevo.",
    });
  }
}

// Eliminar un producto compuesto (cascade elimina los componentes)
export async function deleteComposedProduct(req: Request, res: Response) {
  const { id } = req.params;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "ID de producto inválido" });
  }

  try {
    const { error } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("id", id)
      .eq("is_composed", true);

    if (error)
      return respondWithError(res, error, "deleteComposedProduct", DELETE_OPTIONS);
    res.status(200).json({ message: "Producto compuesto eliminado correctamente" });
  } catch (error) {
    return respondWithError(res, error, "deleteComposedProduct", DELETE_OPTIONS);
  }
}

// --- Helpers ---

export async function enrichComposedStock(
  products: { id: string; is_composed?: boolean; current_stock?: number }[],
) {
  const enriched = await Promise.all(
    products.map(async (product) => {
      if (!product.is_composed) {
        return { ...product, computed_stock: product.current_stock ?? 0 };
      }

      const { data: components } = await supabaseAdmin
        .from("composed_product_components")
        .select("component_product_id, quantity")
        .eq("composed_product_id", product.id);

      if (!components || components.length === 0) {
        return { ...product, computed_stock: 0 };
      }

      const componentIds = components.map((c) => c.component_product_id);
      const { data: compProducts } = await supabaseAdmin
        .from("products")
        .select("id, current_stock")
        .in("id", componentIds);

      if (!compProducts) {
        return { ...product, computed_stock: 0 };
      }

      const stockMap = new Map(
        compProducts.map((p) => [p.id, p.current_stock]),
      );

      const computedStock = Math.min(
        ...components.map((c) => {
          const compStock = stockMap.get(c.component_product_id) || 0;
          return Math.floor(compStock / c.quantity);
        }),
      );

      return { ...product, computed_stock: Math.max(0, computedStock) };
    }),
  );

  return enriched;
}
