import type { Session, User } from "@supabase/supabase-js";
import type { LucideIcon } from "lucide-react";
import type { LocationCode, ProductStocks } from "../config/locations";

// ── Auth ────────────────────────────────────────────────────────────
export type UserRole = "IT" | "ADMIN" | "PROVEEDOR" | "CONSUMIDOR";

// ── Domain ──────────────────────────────────────────────────────────

export interface Product {
  id: number;
  entrepreneurship_id: number;
  name: string;
  price: number;
  current_stock: number;
  image: string | null;
  is_active: boolean;
}

export interface EntrepreneurshipInfo {
  name: string;
}

export interface ProductInfo {
  name: string;
  entrepreneurships: EntrepreneurshipInfo;
}

export interface SaleItem {
  products: ProductInfo;
  quantity: number;
  unit_price: number;
  refunded?: boolean;
  entrepreneur_processed?: boolean;
}

export interface UserInfo {
  name: string;
}

export interface ConsumerSale {
  id: string;
  created_at: string;
  total: number;
  payroll_processed: boolean;
  refunded?: boolean;
  payment_type?: PaymentType;
  payment_method?: PaymentMethod | null;
  note?: string | null;
  users: UserInfo;
  sale_items: SaleItem[];
}

export interface RegistrationRequest {
  id: number;
  nombre: string;
  correo: string;
  rol: UserRole;
  estado: "PENDIENTE" | "APROBADO" | "RECHAZADO";
}
export interface Category {
  id: number;
  name: string;
  slug: string;
}
// ── Nav ─────────────────────────────────────────────────────────────
export type MenuItem = {
  id: string;
  label: string;
  subtitle: string;
  icon: LucideIcon; // Usamos el tipo específico de Lucide para mayor seguridad
  roles: UserRole[];
  path?: string;
};

export interface SidebarUser {
  id: string;
  name: string;
  initials: string;
  role: string;
}

export interface LoginFormType {
  email: string;
  password: string;
}

export interface RegisterForm {
  user_name: string;
  email: string;
  entrepreneurship_name: string;
  role: UserRole[];
}

export interface ApiErrorResponse {
  error?: string;
  message?: string;
  status?: number;
}

// Extendemos el Error nativo para incluir el status sin usar any
export class AppError extends Error {
  status?: number;
  isAxiosError: boolean;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.isAxiosError = true;
    // Necesario para que el instanceof funcione correctamente en TS
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface UpdatePayrollResponse {
  message: string;
  data: {
    id: string;
    payroll_processed: boolean;
    total: number;
    created_at: string;
  };
}

export interface LoginResponse {
  message: string;
  session: Session;
  user: User;
}

export interface SimpleResponse {
  message: string;
  // Set when the action succeeded but a side effect (e.g. sending an email) failed.
  warning?: string;
}

export interface SignupRequest {
  id: string;
  user_name: string;
  email: string;
  entrepreneurship_name?: string;
  role: UserRole[];
  reviewed_by?: string;
  created_at: string;
  status: "PENDIENTE" | "APROBADO" | "RECHAZADO";
}

export interface Entrepreneurship {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  users: {
    name: string;
  };
  logo_url?: string;
  products: {
    count: number;
  }[];
  product_count: number;
}

export type EntrepreneurshipPayload = Pick<
  Entrepreneurship,
  "name" | "description" | "logo_url"
>;

export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  current_stock: number;
  image: string | null;
  category_id: number;
  categories?: Category;
  entrepreneurships: {
    id: number;
    name: string;
  };
  vendor?: string;
  is_composed?: boolean;
}

export interface EntrepreneurshipProduct {
  id: string;
  name: string;
  price: number;
  current_stock: number;
  image: string;
  is_active: boolean;
  entrepreneurship_id: string;
  category_id?: number;
  created_at: string;
  is_composed?: boolean;
  stocks?: ProductStocks;
}

export interface ProductInput {
  name: string;
  price: number;
  current_stock?: number;
  is_active: boolean;
  entrepreneurship_id?: string;
  image: string;
  imageFile?: File | null;
  category_id?: number;
  stocks: ProductStocks;
}

export interface StockMatrixItem {
  product_id: string;
  stocks: ProductStocks;
}

export interface StockMatrixPayload {
  entrepreneurship_id: string;
  items: StockMatrixItem[];
}

export interface StockMatrixResponse {
  message: string;
  data: {
    updated: number;
  };
}

export interface ComposedProductComponent {
  component_product_id: string;
  quantity: number;
  name?: string;
  price?: number;
  current_stock?: number;
  image?: string;
}

export interface ComposedProductInput {
  name: string;
  price: number;
  is_active: boolean;
  entrepreneurship_id: string;
  image: string;
  imageFile?: File | null;
  category_id?: number;
  components: ComposedProductComponent[];
  stocks?: ProductStocks;
}

export type PaymentType = "credit" | "immediate";
export type PaymentMethod = "efectivo" | "binance" | "pago_movil" | null;

export interface CreateSalePayload {
  consumer_id: string;
  items: SaleItemPayload[];
  payment_type?: PaymentType;
  payment_method?: PaymentMethod;
  note?: string;
  location_id: LocationCode;
}

export interface SaleItemPayload {
  product_id: string;
  quantity: number;
}

export interface Sale {
  id: string;
  consumer_id: string;
  total: number;
  payroll_processed: boolean;
  refunded?: boolean;
  created_at: string;
  payment_type: PaymentType;
  payment_method?: PaymentMethod | null;
  location_id?: LocationCode;
}

export interface SaleItemDetail {
  id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  refunded?: boolean;
  entrepreneur_processed?: boolean;
  entrepreneur_processed_at?: string;
  products: {
    id: string;
    name: string;
    entrepreneurships: {
      // Estructura anidada del JSON de /sales
      id: string;
      name: string;
      users: {
        name: string;
      };
      owner_id: string;
    };
  };
}

export interface EntrepreneurshipSale {
  id: string;
  created_at: string;
  total: number;
  payroll_processed: boolean;
  refunded?: boolean;
  payment_type: PaymentType;
  payment_method?: PaymentMethod | null;
  note?: string | null;
  users: {
    id: string;
    name: string;
    email: string;
  };
  sale_items: SaleItemDetail[];
}

// --- Nueva Interfaz para la Vista Global del Admin (GET /sales) ---

export interface EntrepreneurSummary {
  id: string;
  name: string;
  ownerName: string;
  totalRevenue: number;
  pendingPayroll: number;
  salesCount: number;
  pendingIds: string[];
  sedes: LocationCode[];
}

export interface ConsumerSummary {
  id: string;
  name: string;
  email: string;
  totalSpent: number;
  pendingDeduction: number;
  ordersCount: number;
  pendingIds: string[];
  sedes: LocationCode[];
}

export interface PayrollCycle {
  label: string;
  startDay: number;
  endDay: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface GlobalSale {
  id: string;
  created_at: string;
  total: number;
  payroll_processed: boolean;
  refunded?: boolean;
  payment_type: PaymentType;
  payment_method?: PaymentMethod | null;
  note?: string | null;
  location_id?: LocationCode;
  users: {
    id: string;
    name: string;
    email: string;
  };
  sale_items: SaleItemDetail[];
}

export interface SedeBreakdown {
  VF: number;
  GO: number;
  unassigned: number;
}

export interface RefundPayload {
  item_ids?: number[];
}

export interface RefundResponse {
  message: string;
  type: "full" | "partial";
  refunded_amount: number;
  new_total?: number;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  departamento: string;
  created_at?: string;
}

export interface ActiveSessionsResponse {
  count: number;
}

export type Consumer = Pick<
  PublicUser,
  "email" | "name" | "departamento" | "id"
>;

export interface CartHook {
  cart: Record<string, number>;
  addToCart: (id: string) => void;
}

export type ProductCardData = Omit<CatalogProduct, "entrepreneurships"> & {
  vendor: string;
};

export interface AppConfig {
  spreadsheet_id: string;
  credits_sheet: string;
  payments_sheet: string;
}

export interface SheetOption {
  value: string;
  label: string;
}

// ── Software Updates ──────────────────────────────────────────────────────
export interface SoftwareUpdate {
  id: string;
  title: string;
  description: string | null;
  category: "new_feature" | "improvement" | "bugfix" | "style";
  created_at: string;
  version?: string;
}

// ── Payment Data ──────────────────────────────────────────────────────────
export interface BinanceData {
  binance_id: string;
  correo_electronico: string;
}

export interface PagoMovilData {
  banco: string;
  numero_telefonico: string;
  cedula: string;
}

export interface EntrepreneurPaymentData {
  id: string;
  user_id: string;
  payment_method: "efectivo" | "binance" | "pago_movil";
  data: BinanceData | PagoMovilData | Record<string, never>;
  is_active: boolean;
  updated_at: string;
  entrepreneurship_names?: string; // server-enriched via batch endpoint
}
