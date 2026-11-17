import { isLocationCode, type LocationCode } from "../config/locations.js";

export type LocationStock = { offered: boolean; stock: number };
export type ProductStockRow = { location_id: string; stock: number };
export type ProductStocks = Record<LocationCode, LocationStock>;

export function buildStocks(
	rows: ProductStockRow[] | undefined,
	stockOverrides?: Partial<Record<LocationCode, number>>,
): ProductStocks {
	const stocks: ProductStocks = {
		VF: { offered: false, stock: 0 },
		GO: { offered: false, stock: 0 },
	};

	for (const row of rows ?? []) {
		if (typeof row.location_id !== "string") continue;
		const code = row.location_id.trim().toUpperCase();
		if (isLocationCode(code)) {
			stocks[code] = {
				offered: true,
				stock: stockOverrides?.[code] ?? row.stock,
			};
		}
	}

	return stocks;
}
