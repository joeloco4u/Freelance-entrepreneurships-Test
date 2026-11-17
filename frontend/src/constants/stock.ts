/** Must match the backend StockMatrixSchema `items` cap. */
export const MAX_STOCK_MATRIX_ITEMS = 200;

/** Backend `stock` column is int4; StockCellSchema caps at this value. */
export const MAX_STOCK = 2_147_483_647;

/** Stock below this value is surfaced as low stock in the UI. */
export const LOW_STOCK_THRESHOLD = 5;
