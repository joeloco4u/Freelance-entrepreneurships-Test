import z from "zod";
import { LOCATION_CODES, type LocationCode } from "../config/locations.js";

export type UserRole = "IT" | "ADMIN" | "PROVEEDOR" | "CONSUMIDOR";
export type RequestStatus = "PENDIENTE" | "APROBADO" | "RECHAZADO";

export interface Consumer {
	cedula: string;
	name: string;
	department?: string;
	slack_id: string;
}

export interface Product {
	id: string;
	entrepreneurship_id: string;
	name: string;
	price: number;
	current_stock: number;
	image?: string;
	is_active: boolean;
	is_composed?: boolean;
}

export interface ComposedProductComponent {
	id?: string;
	composed_product_id?: string;
	component_product_id: string;
	quantity: number;
}

export interface ComposedProductInput {
	name: string;
	price: number;
	is_active: boolean;
	entrepreneurship_id: string;
	image?: string;
	category_id?: number;
	components: ComposedProductComponent[];
}

export type PaymentType = "credit" | "immediate";
export type PaymentMethod = "efectivo" | "binance" | "pago_movil";

export interface Sale {
	consumer_id: string;
	product_id: string;
	quantity: number;
	unit_price: number;
	total: number;
	sale_date: string;
	payroll_processed: boolean;
	payment_type: PaymentType;
	payment_method?: PaymentMethod | null;
	location_id: LocationCode;
}

export interface Entrepreneurship {
	id: string;
	owner_id: string;
	name: string;
	is_active: boolean;
}

export interface Signup_request {
	id: string;
	email: string;
	user_name: string;
	entrepreneurship_name: string;
	status: RequestStatus;
	reviewed_by: string;
}

export interface User {
	id: string;
	name: string;
	role: UserRole[];
	email: string;
	is_approved: boolean;
}

// --- Esquema para Registro de Consumo (Tablet) ---
export const PurchaseSchema = z.object({
	cedula: z.string().min(5, "La cédula debe tener al menos 5 dígitos"),
	productId: z.uuid("ID de producto inválido"),
	quantity: z
		.number()
		.int()
		.positive("La cantidad debe ser un entero positivo"),
	location_id: z.enum(LOCATION_CODES),
});

// --- Esquema para crear una venta desde el carrito ---
export const SaleRequestSchema = z.object({
	consumer_id: z.uuid(),
	items: z
		.array(
			z.object({
				product_id: z.uuid(),
				quantity: z.number().int().positive(),
			}),
		)
		.min(1)
		.max(100),
	location_id: z.enum(LOCATION_CODES),
	payment_type: z.enum(["credit", "immediate"]).optional(),
	payment_method: z.enum(["efectivo", "binance", "pago_movil"]).nullish(),
	note: z.string().trim().max(500).optional(),
});

// --- Esquema para Solicitud de Registro (Proveedores) ---
export const RegistrationRequestSchema = z.object({
	email: z.email("Formato de correo inválido"),
	nombre_solicitante: z.string().min(3, "Nombre demasiado corto"),
	nombre_emprendimiento: z
		.string()
		.min(2, "Nombre de emprendimiento requerido"),
});

// --- Esquema para editar la matriz de stock por sede ---
export const StockCellSchema = z.strictObject({
	offered: z.boolean(),
	stock: z.number().int().min(0).max(2147483647),
});

export const StockMatrixSchema = z
	.strictObject({
		entrepreneurship_id: z.uuid("Emprendimiento inválido"),
		items: z
			.array(
				z.strictObject({
					product_id: z.uuid("ID de producto inválido"),
					stocks: z.record(z.enum(LOCATION_CODES), StockCellSchema),
				}),
			)
			.min(1)
			.max(200),
	})
	.superRefine((value, ctx) => {
		const seen = new Set<string>();

		for (const item of value.items) {
			const key = item.product_id.toLowerCase();

			if (seen.has(key)) {
				ctx.addIssue({
					code: "custom",
					path: ["items"],
					message: "Producto duplicado en la matriz",
				});
				return;
			}

			seen.add(key);
		}
	});

// --- Extraer los Tipos de TypeScript de los esquemas ---
export type PurchaseInput = z.infer<typeof PurchaseSchema>;
export type SaleRequestInput = z.infer<typeof SaleRequestSchema>;
export type RegistrationRequestInput = z.infer<
	typeof RegistrationRequestSchema
>;
export type StockCellInput = z.infer<typeof StockCellSchema>;
export type StockMatrixInput = z.infer<typeof StockMatrixSchema>;
