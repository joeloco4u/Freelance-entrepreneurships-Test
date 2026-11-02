export const LOCATION_CODES = ["VF", "GO"] as const;

export type LocationCode = (typeof LOCATION_CODES)[number];

export const DEFAULT_LOCATION: LocationCode = "VF";

export const SEDE_STORAGE_KEY = "hq_location";

export const LOCATIONS: Record<
  LocationCode,
  {
    code: LocationCode;
    name: string;
    bannerAlt: string;
    overlayClass: string;
  }
> = {
  VF: {
    code: "VF",
    name: "Valle Frío",
    bannerAlt: "Banner de la sede Valle Frío",
    overlayClass: "bg-blue-900/70",
  },
  GO: {
    code: "GO",
    name: "Grano de Oro",
    bannerAlt: "Banner de la sede Grano de Oro",
    overlayClass: "bg-slate-900/70",
  },
};

export function isLocationCode(value: unknown): value is LocationCode {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toUpperCase();
  return LOCATION_CODES.some((code) => code === normalized);
}

export type AdminSedeFilter = "ALL" | LocationCode;

export type LocationStock = { offered: boolean; stock: number };

export type ProductStocks = Record<LocationCode, LocationStock>;

export const SEDE_FILTER_OPTIONS: { value: AdminSedeFilter; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "VF", label: "VF" },
  { value: "GO", label: "GO" },
];

export function isAdminSedeFilter(value: unknown): value is AdminSedeFilter {
  return value === "ALL" || isLocationCode(value);
}

export function getDefaultProductStocks(currentStock = 0): ProductStocks {
  return {
    VF: { offered: true, stock: currentStock },
    GO: { offered: false, stock: 0 },
  };
}
