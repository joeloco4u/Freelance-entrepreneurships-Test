import { env } from "../config/env.js";
import {
  getCreditsSheet,
  getPaymentsSheet,
  getSpreadsheetId,
  sheets,
} from "./googleSheetsConfig.js";

export async function getSlackBotTokenFromSheet(): Promise<string | null> {
  const sheetUrl = env.slackTokenSheetUrl;
  if (!sheetUrl) {
    console.error("[GoogleSheets] SLACK_TOKEN_SHEET_URL no configurada");
    return null;
  }

  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  const spreadsheetId = match?.[1];
  if (!spreadsheetId) {
    console.error(
      "[GoogleSheets] No se pudo extraer el ID de la hoja desde la URL",
    );
    return null;
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "A2:A2",
    });

    const value = response.data.values?.[0]?.[0];
    if (!value) {
      console.error(
        "[GoogleSheets] Celda A2 vacía en la hoja de configuración de Slack",
      );
      return null;
    }

    if (!value.startsWith("xoxb-")) {
      console.error(
        "[GoogleSheets] El valor en A2 no parece ser un token válido de Slack (debe comenzar con xoxb-)",
      );
      return null;
    }

    return value;
  } catch (err) {
    console.error("[GoogleSheets] Error al leer el token de Slack:", err);
    return null;
  }
}

const TOTAL_COLUMN = "TOTAL";
const NAME_COLUMN_INDEX = 1;
const EMAIL_COLUMN_INDEX = 2;
const PAYMENT_NAME_COLUMN_INDEX = 1;
const PAYMENT_EMAIL_COLUMN_INDEX = 2;
const PAYMENT_EMPRENDIMIENTO_HEADER = "Emprendimientos";
const CLOSING_ROW_LABEL = /^(total|totales|total general)$/i;

function getColumnLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

// Sheet names come from user configuration, so they may contain spaces or quotes
function quoteSheetName(sheetName: string): string {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

function getSheetNames() {
  return {
    creditsSheet: getCreditsSheet(),
    paymentsSheet: getPaymentsSheet(),
  };
}

async function getSheetMeta(sheetName: string) {
  const spreadsheetId = getSpreadsheetId();

  const metadataResponse = await sheets.spreadsheets.get({
    spreadsheetId,
    ranges: [`${quoteSheetName(sheetName)}!1:1`],
    includeGridData: true,
  });

  return metadataResponse.data.sheets?.find(
    (s) => s.properties?.title === sheetName,
  );
}

async function getHeaders(sheetName: string): Promise<string[]> {
  const spreadsheetId = getSpreadsheetId();

  const headersResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteSheetName(sheetName)}!1:1`,
  });

  return headersResponse.data.values?.[0] || [];
}

function findHeaderIndex(headers: string[], headerName: string): number {
  return headers.findIndex(
    (h: string) => h.toLowerCase().trim() === headerName.toLowerCase().trim(),
  );
}

// FUNCIONES PARA ALTA DE FILAS

// Copies the TOTAL formula from the row above into a freshly inserted row.
// Plain numeric totals are skipped on purpose: copying a stale value is worse
// than leaving the cell empty.
async function copyTotalFormula(
  sheetName: string,
  sheetId: number,
  newRowNumber: number,
): Promise<void> {
  const spreadsheetId = getSpreadsheetId();
  const previousRowNumber = newRowNumber - 1;

  try {
    const headers = await getHeaders(sheetName);
    const totalColumnIndex = findHeaderIndex(headers, TOTAL_COLUMN);
    if (totalColumnIndex === -1) return;

    const totalColumnLetter = getColumnLetter(totalColumnIndex);
    const previousCellResponse = await sheets.spreadsheets.get({
      spreadsheetId,
      ranges: [
        `${quoteSheetName(sheetName)}!${totalColumnLetter}${previousRowNumber}`,
      ],
      includeGridData: true,
    });

    const previousCell =
      previousCellResponse.data.sheets?.[0]?.data?.[0]?.rowData?.[0]
        ?.values?.[0];
    if (!previousCell?.userEnteredValue?.formulaValue) return;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            copyPaste: {
              source: {
                sheetId,
                startRowIndex: previousRowNumber - 1,
                endRowIndex: previousRowNumber,
                startColumnIndex: totalColumnIndex,
                endColumnIndex: totalColumnIndex + 1,
              },
              destination: {
                sheetId,
                startRowIndex: newRowNumber - 1,
                endRowIndex: newRowNumber,
                startColumnIndex: totalColumnIndex,
                endColumnIndex: totalColumnIndex + 1,
              },
              pasteType: "PASTE_FORMULA",
            },
          },
        ],
      },
    });
  } catch (err) {
    console.error(
      `[GoogleSheets] No se pudo replicar la fórmula de ${TOTAL_COLUMN} en ${sheetName}:`,
      err,
    );
  }
}

// Inserts a new row right below the last row with data and fills in name/email.
// Returns the 1-based row number, or null when the row could not be created.
async function appendPersonRow(
  sheetName: string,
  nameColumnIndex: number,
  emailColumnIndex: number,
  name: string,
  email: string,
): Promise<number | null> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId || !sheetName) return null;

  const nameColumnLetter = getColumnLetter(nameColumnIndex);

  try {
    const columnResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteSheetName(sheetName)}!${nameColumnLetter}:${nameColumnLetter}`,
    });

    const rows = columnResponse.data.values || [];

    // Walk back over trailing empty rows and closing rows (e.g. "TOTAL")
    let lastDataRow = rows.length;
    while (lastDataRow > 0) {
      const cellValue = rows[lastDataRow - 1]?.[0]?.toString().trim() || "";
      if (cellValue && !CLOSING_ROW_LABEL.test(cellValue)) break;
      lastDataRow--;
    }

    if (lastDataRow === 0) {
      console.warn(
        `[GoogleSheets] La hoja ${sheetName} no tiene datos en la columna ${nameColumnLetter}; no se crea la fila de ${name}`,
      );
      return null;
    }

    const sheet = await getSheetMeta(sheetName);
    const sheetId = sheet?.properties?.sheetId;
    if (sheetId === null || sheetId === undefined) {
      console.warn(
        `[GoogleSheets] No se pudo resolver el sheetId de ${sheetName}; no se crea la fila de ${name}`,
      );
      return null;
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: lastDataRow,
                endIndex: lastDataRow + 1,
              },
              inheritFromBefore: true,
            },
          },
        ],
      },
    });

    const newRowNumber = lastDataRow + 1;
    const quotedSheet = quoteSheetName(sheetName);

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: [
          {
            range: `${quotedSheet}!${nameColumnLetter}${newRowNumber}`,
            values: [[name]],
          },
          {
            range: `${quotedSheet}!${getColumnLetter(emailColumnIndex)}${newRowNumber}`,
            values: [[email]],
          },
        ],
      },
    });

    await copyTotalFormula(sheetName, sheetId, newRowNumber);

    console.info(
      `[GoogleSheets] Fila creada en ${sheetName} (fila ${newRowNumber}): ${name} <${email}>`,
    );

    return newRowNumber;
  } catch (err) {
    console.error(
      `[GoogleSheets] Error creando la fila de ${name} en ${sheetName}:`,
      err,
    );
    return null;
  }
}

// FUNCIONES PARA CALCULOS DE CONSUMIDORES

export async function findFreelancerRow(
  consumerName: string,
  consumerEmail: string,
): Promise<number | null> {
  const { creditsSheet } = getSheetNames();
  const spreadsheetId = getSpreadsheetId();

  if (!spreadsheetId || !creditsSheet) return null;

  const emailMatches = await findInColumn(
    creditsSheet,
    EMAIL_COLUMN_INDEX,
    consumerEmail,
  );
  if (emailMatches !== null) return emailMatches;

  const nameMatches = await findInColumn(
    creditsSheet,
    NAME_COLUMN_INDEX,
    consumerName,
  );
  return nameMatches;
}

// Returns the consumer row, creating it when the configured sheet does not
// have it yet (e.g. right after switching to a new spreadsheet).
export async function getOrCreateFreelancerRow(
  consumerName: string,
  consumerEmail: string,
): Promise<number | null> {
  const { creditsSheet } = getSheetNames();
  const spreadsheetId = getSpreadsheetId();

  if (!spreadsheetId || !creditsSheet) return null;

  const existingRow = await findFreelancerRow(consumerName, consumerEmail);
  if (existingRow !== null) return existingRow;

  const name = consumerName?.trim() || "";
  const email = consumerEmail?.trim() || "";

  if (!name || !email) {
    console.warn(
      "[GoogleSheets] Nombre o email vacíos; no se crea la fila del consumidor",
    );
    return null;
  }

  return appendPersonRow(
    creditsSheet,
    NAME_COLUMN_INDEX,
    EMAIL_COLUMN_INDEX,
    name,
    email,
  );
}

async function findInColumn(
  sheetName: string,
  columnIndex: number,
  searchValue: string,
): Promise<number | null> {
  const columnLetter = getColumnLetter(columnIndex);
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteSheetName(sheetName)}!${columnLetter}:${columnLetter}`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return null;
    }

    const searchLower = searchValue.toLowerCase().trim();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) continue;
      const cellValue = row[0].toString().toLowerCase().trim();

      if (cellValue === searchLower) {
        return i + 1;
      }
    }
  } catch (err) {
    console.error("Error finding in column:", err);
  }

  return null;
}

export async function updateEntrepreneurshipSpent(
  rowNumber: number,
  columnName: string,
  amount: number,
): Promise<void> {
  const { creditsSheet } = getSheetNames();
  const spreadsheetId = getSpreadsheetId();

  if (!spreadsheetId || !creditsSheet) return;

  const sheet = await getSheetMeta(creditsSheet);
  const gridProperties = sheet?.properties?.gridProperties;
  const maxCols = gridProperties?.columnCount || 11;

  const headers = await getHeaders(creditsSheet);
  const totalColumnIndex = findHeaderIndex(headers, TOTAL_COLUMN);

  let targetColumnIndex: number;

  if (totalColumnIndex !== -1) {
    const existingColumnIndex = findHeaderIndex(headers, columnName);

    if (existingColumnIndex !== -1 && existingColumnIndex < totalColumnIndex) {
      targetColumnIndex = existingColumnIndex;
    } else {
      const sheetId = sheet?.properties?.sheetId as number;

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          requests: [
            {
              insertDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: "COLUMNS",
                  startIndex: totalColumnIndex,
                  endIndex: totalColumnIndex + 1,
                },
              },
            },
          ],
        },
      });

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          requests: [
            {
              updateCells: {
                rows: [
                  {
                    values: [{ userEnteredValue: { stringValue: columnName } }],
                  },
                ],
                fields: "userEnteredValue",
                start: {
                  sheetId: sheetId,
                  rowIndex: 0,
                  columnIndex: totalColumnIndex,
                },
              },
            },
            {
              updateCells: {
                rows: [
                  { values: [{ userEnteredValue: { numberValue: amount } }] },
                ],
                fields: "userEnteredValue",
                start: {
                  sheetId: sheetId,
                  rowIndex: rowNumber - 1,
                  columnIndex: totalColumnIndex,
                },
              },
            },
          ],
        },
      });

      return;
    }
  } else {
    targetColumnIndex = headers.length;
    if (targetColumnIndex >= maxCols) {
      const sheetId = sheet?.properties?.sheetId as number;
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          requests: [
            {
              insertDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: "COLUMNS",
                  startIndex: maxCols - 1,
                  endIndex: maxCols,
                },
              },
            },
          ],
        },
      });
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `${quoteSheetName(creditsSheet)}!${getColumnLetter(targetColumnIndex)}1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[columnName]],
      },
    });
  }

  const columnLetter = getColumnLetter(targetColumnIndex);
  const cellRef = `${quoteSheetName(creditsSheet)}!${columnLetter}${rowNumber}`;

  const currentValueResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: cellRef,
  });

  const currentValue = parseFloat(
    currentValueResponse.data.values?.[0]?.[0]?.replace(/[$,]/g, "") || "0",
  );
  const newValue = currentValue + amount;

  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId,
    range: cellRef,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[newValue]],
    },
  });
}

// FUNCIONES PARA CALCULOS DE EMPRENDIMIENTOS

export async function findEntrepreneurRow(
  entrepreneurName: string,
  entrepreneurEmail?: string,
): Promise<number | null> {
  const { paymentsSheet } = getSheetNames();
  const spreadsheetId = getSpreadsheetId();

  if (!spreadsheetId || !paymentsSheet) return null;

  const nameMatches = await findPaymentInColumn(
    paymentsSheet,
    PAYMENT_NAME_COLUMN_INDEX,
    entrepreneurName,
  );
  if (nameMatches !== null) return nameMatches;

  if (entrepreneurEmail) {
    const emailMatches = await findPaymentInColumn(
      paymentsSheet,
      PAYMENT_EMAIL_COLUMN_INDEX,
      entrepreneurEmail,
    );
    if (emailMatches !== null) return emailMatches;
  }

  return null;
}

async function findPaymentInColumn(
  sheetName: string,
  columnIndex: number,
  searchValue: string,
): Promise<number | null> {
  const columnLetter = getColumnLetter(columnIndex);
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteSheetName(sheetName)}!${columnLetter}:${columnLetter}`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return null;
    }

    const searchLower = searchValue.toLowerCase().trim();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) continue;
      const cellValue = row[0].toString().toLowerCase().trim();

      if (cellValue === searchLower) {
        return i + 1;
      }
    }
  } catch (err) {
    console.error("Error finding payment in column:", err);
  }

  return null;
}

export async function updateEntrepreneurEarnings(
  entrepreneurName: string,
  entrepreneurEmail: string,
  amount: number,
): Promise<void> {
  const { paymentsSheet } = getSheetNames();
  const spreadsheetId = getSpreadsheetId();

  if (!spreadsheetId || !paymentsSheet) return;

  // Checked before creating the row: without this column there is nowhere to
  // write the earnings, so creating the row would be pointless.
  const headers = await getHeaders(paymentsSheet);
  const entrepreneurshipColumnIndex = findHeaderIndex(
    headers,
    PAYMENT_EMPRENDIMIENTO_HEADER,
  );

  if (entrepreneurshipColumnIndex === -1) {
    console.warn(
      `[GoogleSheets] Columna "${PAYMENT_EMPRENDIMIENTO_HEADER}" no encontrada en ${paymentsSheet}`,
    );
    return;
  }

  let rowNumber = await findEntrepreneurRow(entrepreneurName, entrepreneurEmail);

  if (rowNumber === null) {
    // Rows in the payments sheet represent an entrepreneurship: the name comes
    // from the entrepreneurship and the email from its owner.
    const name = entrepreneurName?.trim() || "";
    const email = entrepreneurEmail?.trim() || "";

    if (name) {
      rowNumber = await appendPersonRow(
        paymentsSheet,
        PAYMENT_NAME_COLUMN_INDEX,
        PAYMENT_EMAIL_COLUMN_INDEX,
        name,
        email,
      );
    }
  }

  if (rowNumber === null) {
    console.warn(
      `Emprendedor ${entrepreneurName} no encontrado ni creado en ${paymentsSheet}`,
    );
    return;
  }

  const columnLetter = getColumnLetter(entrepreneurshipColumnIndex);
  const cellRef = `${quoteSheetName(paymentsSheet)}!${columnLetter}${rowNumber}`;

  const currentValueResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: cellRef,
  });

  const currentValue = parseFloat(
    currentValueResponse.data.values?.[0]?.[0]?.replace(/[$,]/g, "") || "0",
  );
  const newValue = currentValue + amount;

  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId,
    range: cellRef,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[newValue]],
    },
  });
}
