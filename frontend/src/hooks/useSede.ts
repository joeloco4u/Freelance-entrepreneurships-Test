import { useState } from "react";
import {
  isLocationCode,
  SEDE_STORAGE_KEY,
  type LocationCode,
} from "../config/locations";

function readStoredSede(): LocationCode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SEDE_STORAGE_KEY);
    const normalized = raw?.trim().toUpperCase() ?? "";
    return isLocationCode(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

export function useSede() {
  const [sede, setSedeState] = useState<LocationCode | null>(() =>
    readStoredSede(),
  );

  const setSede = (code: LocationCode) => {
    if (!isLocationCode(code)) return;
    try {
      window.localStorage.setItem(SEDE_STORAGE_KEY, code);
    } catch {
      // keep in-memory
    }
    setSedeState(code);
  };

  return { sede, setSede };
}
