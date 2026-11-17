import type { Request, Response } from "express";
import {
	DEFAULT_LOCATION,
	isLocationCode,
	LOCATION_CODES,
	parseLocation,
	type LocationCode,
} from "../config/locations.js";
import { supabaseAdmin } from "../db.js";
import { uploadProductImage } from "../services/uploadImageService.js";
import { respondWithError } from "../utils/errors.js";
import { buildStocks, type ProductStockRow } from "../utils/stocks.js";

const MAX_PRODUCT_PRICE = 1_000_000_000;

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DELETE_OPTIONS = {
	messages: {
		// foreign_key_violation: the combo is referenced by sale_items
		"23503":
			"No puedes eliminar este combo porque ya tiene ventas registradas. Desactívalo en su lugar.",
	},
	fallback: "No se pudo eliminar el combo. Intenta de nuevo más tarde.",
};

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

type ParsedComponent = { component_product_id: string; quantity: number };

type ComponentValidationRow = {
	id: string;
	entrepreneurship_id: string;
	is_active: boolean | null;
	is_composed: boolean | null;
};

type EnrichedProduct = {
	computed_stock: number;
	computed_stocks: Record<LocationCode, number>;
	product_stock?: ProductStockRow[];
};

function toResponse<T extends EnrichedProduct>(
	product: T,
	rows: ProductStockRow[] | undefined,
) {
	const {
		computed_stock,
		computed_stocks,
		product_stock: _productStock,
		...rest
	} = product;
	return {
		...rest,
		current_stock: computed_stock,
		stocks: buildStocks(rows, computed_stocks),
	};
}

function isValidComponent(component: unknown): component is ParsedComponent {
	if (typeof component !== "object" || component === null) return false;

	const record = component as Record<string, unknown>;
	const componentProductId = record.component_product_id;
	const quantity = record.quantity;

	return (
		typeof componentProductId === "string" &&
		UUID_PATTERN.test(componentProductId) &&
		typeof quantity === "number" &&
		Number.isInteger(quantity) &&
		quantity > 0 &&
		quantity <= 10_000
	);
}

async function validateComponents(
	components: ParsedComponent[],
	entrepreneurshipId: string,
): Promise<string | null> {
	const componentIds = components.map(
		(component) => component.component_product_id,
	);

	if (new Set(componentIds).size !== componentIds.length) {
		return "No se puede repetir un componente en el combo";
	}

	const { data, error } = await supabaseAdmin
		.from("products")
		.select("id, entrepreneurship_id, is_active, is_composed")
		.in("id", componentIds);

	if (error) throw error;

	const productRows = (data ?? []) as ComponentValidationRow[];

	if (productRows.length !== componentIds.length) {
		return "Uno o más componentes no existen";
	}

	const hasInvalidComponent = productRows.some(
		(product) =>
			product.entrepreneurship_id !== entrepreneurshipId ||
			product.is_active !== true ||
			product.is_composed === true,
	);

	if (hasInvalidComponent) {
		return "Uno o más componentes no son válidos para este combo";
	}

	return null;
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
	const result = enriched.map((p) => toResponse(p, p.product_stock));

	res.status(200).json(result);
}

// Obtener un producto compuesto con sus componentes
export async function getComposedProductById(req: Request, res: Response) {
	const { id } = req.params;
	const requestingUser = req.user;

	const location = resolveSede(req, res);
	if (!location) return;

	const { data: product, error } = await supabaseAdmin
		.from("products")
		.select("*, entrepreneurships(owner_id), product_stock(location_id, stock)")
		.eq("id", id)
		.eq("is_composed", true)
		.single();

	if (error || !product) {
		return res.status(404).json({ error: "Producto compuesto no encontrado" });
	}

	const roles: string[] = requestingUser?.user_metadata?.roles ?? [];
	if (
		roles.includes("PROVEEDOR") &&
		product.entrepreneurships?.owner_id !== requestingUser?.id
	) {
		return res
			.status(403)
			.json({ error: "No tienes permiso para ver este producto" });
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

	const { entrepreneurships: _entrepreneurships, ...productWithoutOwner } =
		enrichedProduct;

	res.status(200).json({
		...toResponse(productWithoutOwner, productWithoutOwner.product_stock),
		components: components || [],
	});
}

// Crear un producto compuesto
export async function createComposedProduct(req: Request, res: Response) {
	const location = resolveSede(req, res);
	if (!location) return;

	const requestingUser = req.user;
	const imageFile = req.file;

	const { entrepreneurship_id, name, is_active, category_id, components } =
		req.body;
	const price = parseFloat(req.body.price);

	if (
		!entrepreneurship_id ||
		!name ||
		!Number.isFinite(price) ||
		price < 0 ||
		price > MAX_PRODUCT_PRICE ||
		!components
	) {
		return res.status(400).json({
			error:
				"Los campos entrepreneurship_id, name, price y components son obligatorios y deben ser válidos",
		});
	}

	let parsedComponents: { component_product_id: string; quantity: number }[];
	try {
		parsedComponents =
			typeof components === "string" ? JSON.parse(components) : components;
	} catch {
		return res
			.status(400)
			.json({ error: "components debe ser un JSON válido" });
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
				error: "No tienes permiso para agregar productos a este emprendimiento",
			});
		}

		const validationError = await validateComponents(
			parsedComponents,
			entrepreneurship_id,
		);
		if (validationError) {
			return res.status(400).json({ error: validationError });
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

		const stockRows = LOCATION_CODES.map((code) => ({
			product_id: newProduct.id,
			location_id: code,
			stock: 0,
		}));

		const { error: stockError } = await supabaseAdmin
			.from("product_stock")
			.insert(stockRows);

		if (stockError) {
			await supabaseAdmin
				.from("product_stock")
				.delete()
				.eq("product_id", newProduct.id);
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

		if (compError) {
			await supabaseAdmin
				.from("product_stock")
				.delete()
				.eq("product_id", newProduct.id);
			await supabaseAdmin.from("products").delete().eq("id", newProduct.id);
			throw compError;
		}

		const enriched = await enrichComposedStock(
			[{ ...newProduct, product_stock: stockRows }],
			location,
		);
		const [createdProduct] = enriched;
		if (!createdProduct) throw new Error("No se pudo procesar el combo creado");

		return res.status(201).json(toResponse(createdProduct, stockRows));
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
			return res
				.status(404)
				.json({ error: "Producto compuesto no encontrado" });
		}

		const roles: string[] = requestingUser?.user_metadata?.roles ?? [];
		if (roles.includes("PROVEEDOR")) {
			if (product.entrepreneurships.owner_id !== requestingUser?.id) {
				return res
					.status(403)
					.json({ error: "No tienes permiso para editar este producto" });
			}
		}

		let parsedComponents: ParsedComponent[] | null = null;
		if (req.body.components !== undefined) {
			try {
				parsedComponents =
					typeof req.body.components === "string"
						? JSON.parse(req.body.components)
						: req.body.components;
			} catch {
				return res
					.status(400)
					.json({ error: "components debe ser un JSON válido" });
			}

			if (!Array.isArray(parsedComponents)) {
				return res
					.status(400)
					.json({ error: "components debe ser un arreglo de componentes" });
			}

			if (parsedComponents.length === 0) {
				return res
					.status(400)
					.json({ error: "Debe incluir al menos un componente" });
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

			const validationError = await validateComponents(
				parsedComponents,
				product.entrepreneurship_id,
			);
			if (validationError) {
				return res.status(400).json({ error: validationError });
			}
		}

		const allowedFields = [
			"name",
			"price",
			"is_active",
			"category_id",
		] as const;
		const updates: Record<string, unknown> = {};

		for (const field of allowedFields) {
			if (req.body[field] !== undefined) {
				updates[field] = req.body[field];
			}
		}

		if (updates.price !== undefined) {
			const parsedPrice = parseFloat(updates.price as string);
			if (
				!Number.isFinite(parsedPrice) ||
				parsedPrice < 0 ||
				parsedPrice > MAX_PRODUCT_PRICE
			) {
				return res.status(400).json({
					error: "El precio debe ser un número válido mayor o igual a 0",
				});
			}
			updates.price = parsedPrice;
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
		if (!updatedProduct)
			throw new Error("No se pudo actualizar el producto compuesto");

		// Si hay components en el body, actualizarlos
		if (parsedComponents !== null) {
			const { data: existingComponents } = await supabaseAdmin
				.from("composed_product_components")
				.select("composed_product_id, component_product_id, quantity")
				.eq("composed_product_id", id);

			const previousComponents = (existingComponents ??
				[]) as ComposedComponentRow[];

			const { error: deleteComponentsError } = await supabaseAdmin
				.from("composed_product_components")
				.delete()
				.eq("composed_product_id", id);

			if (deleteComponentsError) throw deleteComponentsError;

			if (parsedComponents.length > 0) {
				const componentsToInsert = parsedComponents.map((c) => ({
					composed_product_id: id,
					component_product_id: c.component_product_id,
					quantity: c.quantity,
				}));

				const { error: compError } = await supabaseAdmin
					.from("composed_product_components")
					.insert(componentsToInsert);

				if (compError) {
					if (previousComponents.length > 0) {
						const { error: restoreError } = await supabaseAdmin
							.from("composed_product_components")
							.insert(
								previousComponents.map((c) => ({
									composed_product_id: c.composed_product_id,
									component_product_id: c.component_product_id,
									quantity: c.quantity,
								})),
							);

						if (restoreError) {
							console.error(
								"[updateComposedProduct] component restore:",
								restoreError,
							);
							throw new Error(
								"No se pudieron restaurar los componentes del combo",
							);
						}
					}
					throw compError;
				}
			}
		}

		const { data: stockData } = await supabaseAdmin
			.from("product_stock")
			.select("location_id, stock")
			.eq("product_id", id);

		const rows = (stockData ?? []) as ProductStockRow[];

		const enriched = await enrichComposedStock(
			[{ ...updatedProduct, product_stock: rows }],
			location,
		);
		const [enrichedProduct] = enriched;
		if (!enrichedProduct) {
			throw new Error("No se pudo procesar el producto compuesto");
		}

		return res.status(200).json(toResponse(enrichedProduct, rows));
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
		const { data: product, error: fetchError } = await supabaseAdmin
			.from("products")
			.select("*, entrepreneurships(owner_id)")
			.eq("id", id)
			.eq("is_composed", true)
			.single();

		if (fetchError || !product) {
			return res
				.status(404)
				.json({ error: "Producto compuesto no encontrado" });
		}

		const requestingUser = req.user;
		const roles: string[] = requestingUser?.user_metadata?.roles ?? [];
		if (
			roles.includes("PROVEEDOR") &&
			product.entrepreneurships.owner_id !== requestingUser?.id
		) {
			return res
				.status(403)
				.json({ error: "No tienes permiso para eliminar este producto" });
		}

		const { error } = await supabaseAdmin
			.from("products")
			.delete()
			.eq("id", id)
			.eq("is_composed", true);

		if (error)
			return respondWithError(
				res,
				error,
				"deleteComposedProduct",
				DELETE_OPTIONS,
			);
		res
			.status(200)
			.json({ message: "Producto compuesto eliminado correctamente" });
	} catch (error) {
		return respondWithError(
			res,
			error,
			"deleteComposedProduct",
			DELETE_OPTIONS,
		);
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

type ComponentProductRow = {
	id: string;
	is_active: boolean | null;
	is_composed: boolean | null;
};

type ComponentStockRow = {
	product_id: string;
	location_id: string;
	stock: number;
};

export async function enrichComposedStock<T extends EnrichableProduct>(
	products: T[],
	location: LocationCode,
): Promise<
	Array<
		T & {
			computed_stock: number;
			computed_stocks: Record<LocationCode, number>;
		}
	>
> {
	const composedIds = products
		.filter((product) => product.is_composed === true)
		.map((product) => product.id);

	const componentsByComposed = new Map<string, Map<string, number>>();
	const componentStockByLocation = new Map<string, Map<LocationCode, number>>();
	const unavailableComponents = new Set<string>();

	if (composedIds.length > 0) {
		const { data: components } = await supabaseAdmin
			.from("composed_product_components")
			.select("composed_product_id, component_product_id, quantity")
			.in("composed_product_id", composedIds);

		const componentRows = (components ?? []) as ComposedComponentRow[];

		for (const component of componentRows) {
			let quantities = componentsByComposed.get(component.composed_product_id);
			if (!quantities) {
				quantities = new Map();
				componentsByComposed.set(component.composed_product_id, quantities);
			}
			quantities.set(
				component.component_product_id,
				(quantities.get(component.component_product_id) ?? 0) +
					component.quantity,
			);
		}

		const componentIds = [
			...new Set(
				componentRows.map((component) => component.component_product_id),
			),
		];

		if (componentIds.length > 0) {
			const [{ data: stocks }, { data: componentProducts }] = await Promise.all(
				[
					supabaseAdmin
						.from("product_stock")
						.select("product_id, location_id, stock")
						.in("location_id", [...LOCATION_CODES])
						.in("product_id", componentIds),
					supabaseAdmin
						.from("products")
						.select("id, is_active, is_composed")
						.in("id", componentIds),
				],
			);

			const componentProductRows = (componentProducts ??
				[]) as ComponentProductRow[];
			const foundIds = new Set(
				componentProductRows.map((product) => product.id),
			);

			for (const componentId of componentIds) {
				if (!foundIds.has(componentId)) {
					unavailableComponents.add(componentId);
				}
			}

			for (const componentProduct of componentProductRows) {
				if (
					componentProduct.is_active !== true ||
					componentProduct.is_composed === true
				) {
					unavailableComponents.add(componentProduct.id);
				}
			}

			for (const stock of (stocks ?? []) as ComponentStockRow[]) {
				if (typeof stock.location_id !== "string") continue;
				const code = stock.location_id.trim().toUpperCase();
				if (!isLocationCode(code)) continue;

				let perLocation = componentStockByLocation.get(stock.product_id);
				if (!perLocation) {
					perLocation = new Map();
					componentStockByLocation.set(stock.product_id, perLocation);
				}
				perLocation.set(code, stock.stock);
			}
		}
	}

	return products.map((product) => {
		if (product.is_composed !== true) {
			const stocks = buildStocks(product.product_stock);
			const computed_stocks: Record<LocationCode, number> = {
				VF: stocks.VF.stock,
				GO: stocks.GO.stock,
			};
			return {
				...product,
				computed_stock: computed_stocks[location],
				computed_stocks,
			};
		}

		const components = componentsByComposed.get(product.id);
		const computed_stocks: Record<LocationCode, number> = { VF: 0, GO: 0 };

		if (components && components.size > 0) {
			let allComponentsAvailable = true;

			for (const [componentId, quantity] of components) {
				if (
					!Number.isInteger(quantity) ||
					quantity <= 0 ||
					unavailableComponents.has(componentId)
				) {
					allComponentsAvailable = false;
					break;
				}
			}

			if (allComponentsAvailable) {
				for (const code of LOCATION_CODES) {
					const availablePerComponent: number[] = [];

					for (const [componentId, quantity] of components) {
						const componentStock =
							componentStockByLocation.get(componentId)?.get(code) ?? 0;
						availablePerComponent.push(Math.floor(componentStock / quantity));
					}

					computed_stocks[code] = Math.max(
						0,
						Math.min(...availablePerComponent),
					);
				}
			}
		}

		return {
			...product,
			computed_stock: computed_stocks[location],
			computed_stocks,
		};
	});
}
