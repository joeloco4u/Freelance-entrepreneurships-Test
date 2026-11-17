import {
  LOCATION_CODES,
  type AdminSedeFilter,
  type LocationCode,
} from "../config/locations";
import { LOW_STOCK_THRESHOLD } from "../constants/stock";
import type { EntrepreneurshipProduct } from "../types";

export type SedeStockEntry = {
  code: LocationCode;
  stock: number;
  isLow: boolean;
};

export function getOfferedSedeCodes(
  product: EntrepreneurshipProduct,
): LocationCode[] {
  return LOCATION_CODES.filter(
    (code) => product.stocks?.[code]?.offered === true,
  );
}

export function getSedeStockEntries(
  product: EntrepreneurshipProduct,
  sedeFilter: AdminSedeFilter,
): SedeStockEntry[] {
  const stocks = product.stocks;
  if (!stocks) return [];

  const toEntry = (code: LocationCode): SedeStockEntry => {
    const stock = stocks[code]?.stock ?? 0;
    return { code, stock, isLow: stock < LOW_STOCK_THRESHOLD };
  };

  if (sedeFilter !== "ALL") {
    return stocks[sedeFilter]?.offered ? [toEntry(sedeFilter)] : [];
  }

  return getOfferedSedeCodes(product).map(toEntry);
}

export function getEffectiveStock(
  product: EntrepreneurshipProduct,
  sedeFilter: AdminSedeFilter,
): number {
  // Defensive fallback for legacy payloads only: the list endpoint always
  // returns `stocks`. Render helpers intentionally return `[]` → "—" rather
  // than fabricating 0.
  const stocks = product.stocks;
  if (!stocks) return product.current_stock;

  if (sedeFilter !== "ALL") {
    return stocks[sedeFilter]?.stock ?? 0;
  }

  return LOCATION_CODES.reduce(
    (total, code) =>
      stocks[code]?.offered === true ? total + (stocks[code]?.stock ?? 0) : total,
    0,
  );
}
