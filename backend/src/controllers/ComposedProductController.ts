import type { Request, Response } from "express";
import {
  DEFAULT_LOCATION,
  isLocationCode,
  parseLocation,
  type LocationCode,
} from "../config/locations.js";
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

function withComputedStock<T extends { computed_stock: number }>(product: T) {
  return { ...product, current_stock: product.computed_stock };
}

type ParsedComponent = { component_product_id: string; quantity: number };

function isValidComponent(component: ParsedComponent): boolean {
  return (
    typeof component.component_product_id === "string" &&
    component.component_product_id.trim() !== "" &&
    Number.isInteger(component.quantity) &&
    component.quantity > 0
  );
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

// Obtener todos los productos compuestos de un emprendimiento (con stock calculado)
export async function getComposedProductsByEntrepreneurship(
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

    if (entrepreneurship.owner_id !== requestingUser.id) {
      return res.status(403).json({
        error:
          "No tienes permiso para ver los productos de este emprendimiento",
      });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*, product_stock(location_id, stock)")
    .eq("entrepreneurship_id", entrepreneurship_id)
    .eq("is_composed", true);

  if (error)
    return respondWithError(res, error, "getComposedProducts", {
      fallback: "No se pudieron cargar los combos. Intenta de nuevo más tarde.",
    });

  const enriched = await enrichComposedStock(data ?? [], location);
  const result = enriched.map((p) => {
    const rows = p.product_stock;
    const { product_stock: _productStock, ...product } = p;
    return {
      ...product,
      current_stock: p.computed_stock ?? 0,
      stocks: buildStocks(rows),
    };
  });

  res.status(200).json(result);
}

// Obtener un producto compuesto con sus componentes
export async function getComposedProductById(req: Request, res: Response) {
  const { id } = req.params;

  const location = resolveSede(req, res);
  if (!location) return;

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
    .select("*, component_product:component_product_id(id, name, price, image)")
    .eq("composed_product_id", id);

  const enriched = await enrichComposedStock([product], location);
  const [enrichedProduct] = enriched;

  if (!enrichedProduct) {
    return res
      .status(500)
      .json({ error: "Error al procesar el producto compuesto" });
  }

  res
    .status(200)
    .json({ ...withComputedStock(enrichedProduct), components: components || [] });
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

  if (parsedComponents.length > 50) {
    return res.status(400).json({
      error: "Un combo no puede tener más de 50 componentes",
    });
  }

  if (!parsedComponents.every(isValidComponent)) {
    return res.status(400).json({
      error:
        "Cada componente debe tener un product_id válido y una cantidad entera positiva",
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

    const { error: stockError } = await supabaseAdmin
      .from("product_stock")
      .insert({
        product_id: newProduct.id,
        location_id: DEFAULT_LOCATION,
        stock: 0,
      });

    if (stockError) {
      await supabaseAdmin.from("products").delete().eq("id", newProduct.id);
      throw stockError;
    }

    const componentsToInsert = parsedComponents.map((c) => ({
      composed_product_id: newProduct.id,
      component_product_id: c.component_product_id,
      quantity: c.quantity,
    }));

    const { error: compError } = await supabaseAdmin
      .from("composed_product_components")
      .insert(componentsToInsert);

    if (compError) throw compError;

    const enriched = await enrichComposedStock(
      [newProduct],
      DEFAULT_LOCATION,
    );
    const [createdProduct] = enriched;
    if (!createdProduct) throw new Error("No se pudo procesar el combo creado");

    return res.status(201).json(withComputedStock(createdProduct));
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

  const location = resolveSede(req, res);
  if (!location) return;

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

    const allowedFields = [
      "name",
      "price",
      "is_active",
      "category_id",
      "image",
    ] as const;
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.price !== undefined) {
      updates.price = parseFloat(updates.price as string);
    }
    if (updates.is_active !== undefined) {
      updates.is_active =
        updates.is_active === "true" || updates.is_active === true;
    }
    if (updates.category_id !== undefined) {
      updates.category_id = parseInt(updates.category_id as string, 10);
    }

    if (imageFile) {
      const fileName = `${Date.now()}-${id}`;
      const path = `${product.entrepreneurship_id}/${fileName}`;
      updates.image = await uploadProductImage(imageFile, path);
    }

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
        if (parsedComponents.length > 50) {
          return res.status(400).json({
            error: "Un combo no puede tener más de 50 componentes",
          });
        }

        if (!parsedComponents.every(isValidComponent)) {
          return res.status(400).json({
            error:
              "Cada componente debe tener un product_id válido y una cantidad entera positiva",
          });
        }

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

    const enriched = await enrichComposedStock([updatedProduct], location);
    const [enrichedProduct] = enriched;
    if (!enrichedProduct) {
      throw new Error("No se pudo procesar el producto compuesto");
    }

    return res.status(200).json(withComputedStock(enrichedProduct));
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

interface EnrichableProduct {
  id: string;
  is_composed?: boolean;
  product_stock?: ProductStockRow[];
}

type ComposedComponentRow = {
  composed_product_id: string;
  component_product_id: string;
  quantity: number;
};

export async function enrichComposedStock(
  products: EnrichableProduct[],
  location: LocationCode,
) {
  const composedIds = products
    .filter((product) => product.is_composed === true)
    .map((product) => product.id);

  const componentsByComposed = new Map<string, ComposedComponentRow[]>();
  let componentStockMap = new Map<string, number>();

  if (composedIds.length > 0) {
    const { data: components } = await supabaseAdmin
      .from("composed_product_components")
      .select("composed_product_id, component_product_id, quantity")
      .in("composed_product_id", composedIds);

    const componentRows = (components ?? []) as ComposedComponentRow[];

    for (const component of componentRows) {
      const list = componentsByComposed.get(component.composed_product_id) ?? [];
      list.push(component);
      componentsByComposed.set(component.composed_product_id, list);
    }

    const componentIds = [
      ...new Set(componentRows.map((component) => component.component_product_id)),
    ];

    if (componentIds.length > 0) {
      const { data: stocks } = await supabaseAdmin
        .from("product_stock")
        .select("product_id, stock")
        .eq("location_id", location)
        .in("product_id", componentIds);

      componentStockMap = new Map(
        (stocks ?? []).map((stock) => [stock.product_id, stock.stock]),
      );
    }
  }

  return products.map((product) => {
    if (!product.is_composed) {
      const stock =
        product.product_stock?.find((row) => row.location_id === location)
          ?.stock ?? 0;
      return { ...product, computed_stock: stock };
    }

    const components = componentsByComposed.get(product.id);
    if (
      !components ||
      components.length === 0 ||
      components.some(
        (component) =>
          !Number.isInteger(component.quantity) || component.quantity <= 0,
      )
    ) {
      return { ...product, computed_stock: 0 };
    }

    const computedStock = Math.min(
      ...components.map((component) => {
        const componentStock =
          componentStockMap.get(component.component_product_id) ?? 0;
        return Math.floor(componentStock / component.quantity);
      }),
    );

    return { ...product, computed_stock: Math.max(0, computedStock) };
  });
}
