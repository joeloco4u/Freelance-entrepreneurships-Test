import { sheets_v4 } from "@googleapis/sheets";
import { JWT } from "google-auth-library";
import { env } from "../config/env.js";
import { getAppConfigValue } from "./appConfigStore.js";

const serviceEmail = env.googleServiceAccountEmail || "";
const privateKey = env.googlePrivateKey || "";

function createAuth() {
  return new JWT({
    email: serviceEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export const sheets = new sheets_v4.Sheets({ auth: createAuth() });

export function getSpreadsheetId(): string {
  return getAppConfigValue("spreadsheet_id") || "";
}

export function getCreditsSheet(): string {
  return getAppConfigValue("credits_sheet") || "Creditos";
}

export function getPaymentsSheet(): string {
  return getAppConfigValue("payments_sheet") || "Pagos";
}

export function isGoogleSheetsConfigured(): boolean {
  return !!(serviceEmail && privateKey);
}

export function getSheetsClient(): sheets_v4.Sheets {
  return sheets;
}
