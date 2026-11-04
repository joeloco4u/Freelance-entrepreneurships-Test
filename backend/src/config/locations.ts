export const LOCATION_CODES = ["VF", "GO"] as const;

export type LocationCode = (typeof LOCATION_CODES)[number];

export const DEFAULT_LOCATION: LocationCode = "VF";

export function isLocationCode(value: unknown): value is LocationCode {
	if (typeof value !== "string") return false;
	const normalized = value.trim().toUpperCase();
	return LOCATION_CODES.some((code) => code === normalized);
}

export function parseLocation(value: unknown): LocationCode | null {
	if (typeof value !== "string") return null;
	const normalized = value.trim().toUpperCase();
	return LOCATION_CODES.find((code) => code === normalized) ?? null;
}
