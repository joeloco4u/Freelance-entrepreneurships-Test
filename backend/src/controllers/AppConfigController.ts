import type { Request, Response } from "express";
import { supabaseAdmin } from "../db.js";
import { getSheetsClient } from "../services/googleSheetsConfig.js";
import { setAppConfigValue } from "../services/appConfigStore.js";
import { respondWithError } from "../utils/errors.js";

export interface AppConfig {
  key: string;
  value: string;
}

export async function getAppConfig(_req: Request, res: Response) {
  try {
    const { data, error } = await supabaseAdmin
      .from("app_config")
      .select("key, value")
      .order("key");

    if (error) throw error;

    const config: Record<string, string> = {};
    for (const item of data || []) {
      config[item.key] = item.value;
    }

    res.status(200).json(config);
  } catch (error: unknown) {
    respondWithError(res, error, "getAppConfig", {
      fallback: "No se pudo cargar la configuración. Intenta de nuevo más tarde.",
    });
  }
}

export async function saveAppConfig(req: Request, res: Response) {
  const { config } = req.body;

  if (!config || typeof config !== "object") {
    return res.status(400).json({ error: "Configuración inválida" });
  }

  try {
    for (const [key, value] of Object.entries(config)) {
      const stringValue = String(value);
      const { error: upsertError } = await supabaseAdmin
        .from("app_config")
        .upsert({ key, value: stringValue }, { onConflict: "key" });

      if (upsertError) {
        console.error(`Error guardando ${key}:`, upsertError);
      } else {
        await setAppConfigValue(key, stringValue);
      }
    }

    res.status(200).json({ message: "Configuración guardada" });
  } catch (error: unknown) {
    respondWithError(res, error, "saveAppConfig", {
      fallback: "No se pudo guardar la configuración. Intenta de nuevo más tarde.",
    });
  }
}

export async function getAvailableSheets(req: Request, res: Response) {
  const { spreadsheetId } = req.query;

  if (!spreadsheetId || typeof spreadsheetId !== "string") {
    return res.status(400).json({ error: "ID de spreadsheet requerido" });
  }

  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      ranges: [],
      includeGridData: false,
    });

    const sheetNames = response.data.sheets
      ?.filter((s) => s.properties?.title)
      .map((s) => s.properties!.title as string)
      .sort();

    res.status(200).json({ sheets: sheetNames || [] });
  } catch (error: unknown) {
    respondWithError(res, error, "getAvailableSheets", {
      fallback:
        "No se pudieron obtener las hojas. Verifica el ID de la hoja de cálculo e intenta de nuevo.",
    });
  }
}