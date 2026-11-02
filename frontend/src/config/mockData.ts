import type { User } from "@supabase/supabase-js";
import type {
  CatalogProduct,
  Category,
  EntrepreneurshipProduct,
  GlobalSale,
  SidebarUser,
  SoftwareUpdate,
  UserRole,
} from "../types";
import type { LocationCode, ProductStocks } from "./locations";

// Offline-safe placeholder image. The SVG is URL-encoded so it works as a data URI.
const MOCK_IMAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="#f3f4f6"/><rect x="56" y="56" width="288" height="288" rx="28" fill="#e5e7eb"/><circle cx="200" cy="172" r="56" fill="#9ca3af"/><rect x="120" y="260" width="160" height="24" rx="12" fill="#9ca3af"/></svg>`;
const MOCK_IMAGE = `data:image/svg+xml,${encodeURIComponent(MOCK_IMAGE_SVG)}`;

export const MOCK_CATEGORIES: Category[] = [
  { id: 1, name: "Comida", slug: "comida" },
  { id: 2, name: "Bebidas", slug: "bebidas" },
  { id: 3, name: "Postres", slug: "postres" },
];

const MOCK_CATALOG_ENTREPRENEURSHIPS = {
  food: { id: 1, name: "Emprendimiento Mock" },
  desserts: { id: 2, name: "Dulces Mock" },
  drinks: { id: 3, name: "Cafetería Mock" },
} as const;

export const MOCK_CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    id: "mock-1",
    name: "4 Torontos",
    price: 12.5,
    current_stock: 8,
    image: MOCK_IMAGE,
    category_id: 1,
    entrepreneurships: MOCK_CATALOG_ENTREPRENEURSHIPS.food,
    is_composed: false,
  },
  {
    id: "mock-2",
    name: "Bolitas de coco",
    price: 3.75,
    current_stock: 0,
    image: MOCK_IMAGE,
    category_id: 3,
    entrepreneurships: MOCK_CATALOG_ENTREPRENEURSHIPS.desserts,
    is_composed: false,
  },
  {
    id: "mock-3",
    name: "Café latte",
    price: 4.5,
    current_stock: 15,
    image: MOCK_IMAGE,
    category_id: 2,
    entrepreneurships: MOCK_CATALOG_ENTREPRENEURSHIPS.drinks,
    is_composed: false,
  },
  {
    id: "mock-4",
    name: "Tarta de queso",
    price: 6,
    current_stock: 5,
    image: MOCK_IMAGE,
    category_id: 3,
    entrepreneurships: MOCK_CATALOG_ENTREPRENEURSHIPS.desserts,
    is_composed: false,
  },
  {
    id: "mock-5",
    name: "Jugo natural",
    price: 2.25,
    current_stock: 20,
    image: MOCK_IMAGE,
    category_id: 2,
    entrepreneurships: MOCK_CATALOG_ENTREPRENEURSHIPS.drinks,
    is_composed: false,
  },
  {
    id: "mock-6",
    name: "Empanada de queso",
    price: 2,
    current_stock: 12,
    image: MOCK_IMAGE,
    category_id: 1,
    entrepreneurships: MOCK_CATALOG_ENTREPRENEURSHIPS.food,
    is_composed: false,
  },
];

export const MOCK_PRODUCT_STOCKS: Record<string, ProductStocks> = {
  "mock-1": {
    VF: { offered: true, stock: 8 },
    GO: { offered: true, stock: 5 },
  },
  "mock-2": {
    VF: { offered: true, stock: 0 },
    GO: { offered: false, stock: 0 },
  },
  "mock-3": {
    VF: { offered: false, stock: 0 },
    GO: { offered: true, stock: 15 },
  },
  "mock-4": {
    VF: { offered: true, stock: 0 },
    GO: { offered: true, stock: 5 },
  },
  "mock-5": {
    VF: { offered: true, stock: 20 },
    GO: { offered: true, stock: 20 },
  },
  "mock-6": {
    VF: { offered: true, stock: 12 },
    GO: { offered: true, stock: 7 },
  },
};

const mockCatalogByLocation = new Map<LocationCode, CatalogProduct[]>();

export function getMockCatalogForLocation(
  location: LocationCode,
): CatalogProduct[] {
  const cached = mockCatalogByLocation.get(location);
  if (cached) return cached;

  const products = MOCK_CATALOG_PRODUCTS.flatMap((product) => {
    const stocks = MOCK_PRODUCT_STOCKS[product.id]?.[location];
    if (!stocks?.offered) return [];
    return [{ ...product, current_stock: stocks.stock }];
  });

  mockCatalogByLocation.set(location, products);
  return products;
}

// No `components` key on purpose: `isComposedInput` must keep treating these as simple products.
export const MOCK_ENTREPRENEURSHIP_PRODUCTS: EntrepreneurshipProduct[] = [
  {
    id: "mock-1",
    name: "4 Torontos",
    price: 12.5,
    current_stock: 8,
    image: MOCK_IMAGE,
    is_active: true,
    entrepreneurship_id: "mock-ent-1",
    category_id: 1,
    created_at: "2024-01-15T10:00:00.000Z",
    is_composed: false,
    stocks: MOCK_PRODUCT_STOCKS["mock-1"],
  },
  {
    id: "mock-2",
    name: "Bolitas de coco",
    price: 3.75,
    current_stock: 0,
    image: MOCK_IMAGE,
    is_active: true,
    entrepreneurship_id: "mock-ent-1",
    category_id: 3,
    created_at: "2024-01-16T10:00:00.000Z",
    is_composed: false,
    stocks: MOCK_PRODUCT_STOCKS["mock-2"],
  },
  {
    id: "mock-3",
    name: "Café latte",
    price: 4.5,
    current_stock: 0,
    image: MOCK_IMAGE,
    is_active: true,
    entrepreneurship_id: "mock-ent-1",
    category_id: 2,
    created_at: "2024-01-17T10:00:00.000Z",
    is_composed: false,
    stocks: MOCK_PRODUCT_STOCKS["mock-3"],
  },
  {
    id: "mock-4",
    name: "Tarta de queso",
    price: 6,
    current_stock: 0,
    image: MOCK_IMAGE,
    is_active: true,
    entrepreneurship_id: "mock-ent-1",
    category_id: 3,
    created_at: "2024-01-18T10:00:00.000Z",
    is_composed: false,
    stocks: MOCK_PRODUCT_STOCKS["mock-4"],
  },
  {
    id: "mock-5",
    name: "Jugo natural",
    price: 2.25,
    current_stock: 20,
    image: MOCK_IMAGE,
    is_active: true,
    entrepreneurship_id: "mock-ent-1",
    category_id: 2,
    created_at: "2024-01-19T10:00:00.000Z",
    is_composed: false,
    stocks: MOCK_PRODUCT_STOCKS["mock-5"],
  },
  {
    id: "mock-6",
    name: "Empanada de queso",
    price: 2,
    current_stock: 12,
    image: MOCK_IMAGE,
    is_active: false,
    entrepreneurship_id: "mock-ent-1",
    category_id: 1,
    created_at: "2024-01-20T10:00:00.000Z",
    is_composed: false,
    stocks: MOCK_PRODUCT_STOCKS["mock-6"],
  },
];

const MOCK_SALE_USERS = {
  ana: {
    id: "mock-user-1",
    name: "Ana Torres",
    email: "ana.torres@example.com",
  },
  luis: {
    id: "mock-user-2",
    name: "Luis Pérez",
    email: "luis.perez@example.com",
  },
} as const;

const MOCK_SALE_ENTREPRENEURSHIPS = {
  mock: {
    id: "ent-1",
    name: "Emprendimiento Mock",
    owner_id: "mock-owner-1",
    users: { name: "Mock Admin" },
  },
  dulces: {
    id: "ent-2",
    name: "Dulces Mock",
    owner_id: "mock-owner-2",
    users: { name: "Lucía Méndez" },
  },
  cafeteria: {
    id: "ent-3",
    name: "Cafetería Mock",
    owner_id: "mock-owner-3",
    users: { name: "Carlos Ruiz" },
  },
} as const;

const MOCK_SALE_PRODUCTS = {
  "mock-1": {
    id: "mock-1",
    name: "4 Torontos",
    entrepreneurships: MOCK_SALE_ENTREPRENEURSHIPS.mock,
  },
  "mock-2": {
    id: "mock-2",
    name: "Bolitas de coco",
    entrepreneurships: MOCK_SALE_ENTREPRENEURSHIPS.dulces,
  },
  "mock-3": {
    id: "mock-3",
    name: "Café latte",
    entrepreneurships: MOCK_SALE_ENTREPRENEURSHIPS.cafeteria,
  },
  "mock-4": {
    id: "mock-4",
    name: "Tarta de queso",
    entrepreneurships: MOCK_SALE_ENTREPRENEURSHIPS.dulces,
  },
  "mock-5": {
    id: "mock-5",
    name: "Jugo natural",
    entrepreneurships: MOCK_SALE_ENTREPRENEURSHIPS.cafeteria,
  },
  "mock-6": {
    id: "mock-6",
    name: "Empanada de queso",
    entrepreneurships: MOCK_SALE_ENTREPRENEURSHIPS.mock,
  },
} as const;

export const MOCK_SALES: GlobalSale[] = [
  {
    id: "mock-sale-1",
    created_at: "2026-10-20T10:00:00.000Z",
    total: 25,
    payroll_processed: false,
    refunded: false,
    payment_type: "credit",
    payment_method: null,
    location_id: "VF",
    users: MOCK_SALE_USERS.ana,
    sale_items: [
      {
        id: 1,
        quantity: 2,
        unit_price: 12.5,
        subtotal: 25,
        refunded: false,
        entrepreneur_processed: false,
        products: MOCK_SALE_PRODUCTS["mock-1"],
      },
    ],
  },
  {
    id: "mock-sale-2",
    created_at: "2026-10-22T10:00:00.000Z",
    total: 11.25,
    payroll_processed: true,
    refunded: false,
    payment_type: "credit",
    payment_method: null,
    location_id: "VF",
    users: MOCK_SALE_USERS.ana,
    sale_items: [
      {
        id: 2,
        quantity: 3,
        unit_price: 3.75,
        subtotal: 11.25,
        refunded: false,
        entrepreneur_processed: false,
        products: MOCK_SALE_PRODUCTS["mock-2"],
      },
    ],
  },
  {
    id: "mock-sale-3",
    created_at: "2026-10-25T10:00:00.000Z",
    total: 9,
    payroll_processed: false,
    refunded: false,
    payment_type: "immediate",
    payment_method: "efectivo",
    location_id: "GO",
    users: MOCK_SALE_USERS.luis,
    sale_items: [
      {
        id: 3,
        quantity: 1,
        unit_price: 4.5,
        subtotal: 4.5,
        refunded: false,
        entrepreneur_processed: false,
        products: MOCK_SALE_PRODUCTS["mock-3"],
      },
      {
        id: 4,
        quantity: 2,
        unit_price: 2.25,
        subtotal: 4.5,
        refunded: false,
        entrepreneur_processed: false,
        products: MOCK_SALE_PRODUCTS["mock-5"],
      },
    ],
  },
  {
    id: "mock-sale-4",
    created_at: "2026-10-28T10:00:00.000Z",
    total: 8,
    payroll_processed: false,
    refunded: false,
    payment_type: "credit",
    payment_method: null,
    location_id: "VF",
    users: MOCK_SALE_USERS.ana,
    sale_items: [
      {
        id: 5,
        quantity: 4,
        unit_price: 2,
        subtotal: 8,
        refunded: false,
        entrepreneur_processed: false,
        products: MOCK_SALE_PRODUCTS["mock-6"],
      },
    ],
  },
  {
    id: "mock-sale-5",
    created_at: "2026-11-01T10:00:00.000Z",
    total: 2.25,
    payroll_processed: false,
    refunded: false,
    payment_type: "credit",
    payment_method: null,
    location_id: "GO",
    users: MOCK_SALE_USERS.ana,
    sale_items: [
      {
        id: 6,
        quantity: 1,
        unit_price: 2.25,
        subtotal: 2.25,
        refunded: false,
        entrepreneur_processed: false,
        products: MOCK_SALE_PRODUCTS["mock-5"],
      },
    ],
  },
  {
    id: "mock-sale-6",
    created_at: "2026-10-30T10:00:00.000Z",
    total: 6,
    payroll_processed: false,
    refunded: true,
    payment_type: "credit",
    payment_method: null,
    location_id: "GO",
    users: MOCK_SALE_USERS.luis,
    sale_items: [
      {
        id: 7,
        quantity: 1,
        unit_price: 6,
        subtotal: 6,
        refunded: true,
        entrepreneur_processed: false,
        products: MOCK_SALE_PRODUCTS["mock-4"],
      },
    ],
  },
];

export const MOCK_AUTH_USER: User = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  email: "mock.admin@example.com",
  email_confirmed_at: "2024-01-01T00:00:00.000Z",
  confirmed_at: "2024-01-01T00:00:00.000Z",
  last_sign_in_at: "2024-01-01T00:00:00.000Z",
  app_metadata: {
    provider: "email",
    providers: ["email"],
  },
  user_metadata: {
    name: "Mock Admin",
    roles: ["ADMIN", "IT"],
  },
  identities: [],
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  is_anonymous: false,
};

export const MOCK_SOFTWARE_UPDATES: SoftwareUpdate[] = [
  {
    id: "mock-update-1",
    title: "Catálogo más rápido",
    description: "Mejoramos la carga y el filtrado de productos del catálogo.",
    category: "improvement",
    created_at: "2026-10-20T10:00:00.000Z",
    version: "1.4.0",
  },
  {
    id: "mock-update-2",
    title: "Nuevo panel de emprendedores",
    description: "Los administradores ahora ven métricas resumidas por negocio.",
    category: "new_feature",
    created_at: "2026-10-12T10:00:00.000Z",
    version: "1.3.0",
  },
  {
    id: "mock-update-3",
    title: "Corrección en el carrito",
    description: "Se corrigió el cálculo de totales con productos sin stock.",
    category: "bugfix",
    created_at: "2026-10-05T10:00:00.000Z",
    version: "1.2.1",
  },
];

export const MOCK_SIDEBAR_USER: SidebarUser = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Mock Admin",
  initials: "MA",
  role: "Admin • It",
};

export const MOCK_ROLES: UserRole[] = ["ADMIN", "IT"];
