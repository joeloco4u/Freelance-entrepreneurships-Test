import { useMemo } from "react";
import {
  isLocationCode,
  LOCATION_CODES,
  type LocationCode,
} from "../../../../../config/locations";
import type {
  EntrepreneurshipProduct,
  EntrepreneurshipSale,
  SedeBreakdown,
  SedeInventoryBreakdown,
} from "../../../../../types";

export function useOverviewStats(
  sales: EntrepreneurshipSale[],
  products: EntrepreneurshipProduct[],
) {
  return useMemo(() => {
    const saleItemsTotal = (sale: EntrepreneurshipSale) =>
      sale.sale_items.reduce(
        (sum, item) => sum + (item.refunded ? 0 : Number(item.subtotal ?? 0)),
        0,
      );

    let totalRevenue = 0;
    const revenueBySede: SedeBreakdown = { VF: 0, GO: 0, unassigned: 0 };
    const pendingBySede: SedeBreakdown = { VF: 0, GO: 0, unassigned: 0 };

    for (const sale of sales) {
      const amount = sale.refunded ? 0 : saleItemsTotal(sale);
      totalRevenue += amount;
      const normalizedLocation = sale.location_id?.trim().toUpperCase();
      const sede: LocationCode | "unassigned" = isLocationCode(
        normalizedLocation,
      )
        ? normalizedLocation
        : "unassigned";
      revenueBySede[sede] += amount;
      if (
        sale.payment_type !== "immediate" &&
        !sale.payroll_processed &&
        !sale.refunded
      ) {
        pendingBySede[sede] += amount;
      }
    }

    const totalProducts = products.length;

    const inventoryBySede: SedeInventoryBreakdown = {
      VF: { lowStock: 0, outOfStock: 0 },
      GO: { lowStock: 0, outOfStock: 0 },
    };

    let lowStockProducts = 0;
    let outOfStock = 0;

    for (const product of products) {
      for (const location of LOCATION_CODES) {
        const cell = product.stocks?.[location];
        if (!cell?.offered) continue;
        if (cell.stock > 0 && cell.stock <= 5) {
          inventoryBySede[location].lowStock += 1;
        }
        if (cell.stock === 0) {
          inventoryBySede[location].outOfStock += 1;
        }
      }

      // Composed products have no product_stock rows and use the computed
      // current_stock; the !product.stocks branch is defensive for legacy
      // payloads that omit the stocks matrix.
      if (!product.stocks || product.is_composed) {
        if (product.current_stock > 0 && product.current_stock <= 5) {
          lowStockProducts += 1;
        }
        if (product.current_stock === 0) {
          outOfStock += 1;
        }
        continue;
      }

      const offeredStocks = LOCATION_CODES.flatMap((code) => {
        const cell = product.stocks?.[code];
        return cell?.offered ? [cell.stock] : [];
      });

      // Stocks present but not offered in any sede: exclude from global counts.
      if (offeredStocks.length === 0) continue;

      const maxOfferedStock = Math.max(...offeredStocks);
      if (maxOfferedStock > 0 && maxOfferedStock <= 5) {
        lowStockProducts += 1;
      }
      if (maxOfferedStock === 0) {
        outOfStock += 1;
      }
    }

    const pendingPayrollCount = sales.filter(
      (s) =>
        s.payment_type !== "immediate" &&
        !s.payroll_processed &&
        !s.refunded,
    ).length;

    const processedPayrollTotal = sales
      .filter(
        (s) =>
          s.payment_type !== "immediate" &&
          s.payroll_processed &&
          !s.refunded,
      )
      .reduce((acc, s) => acc + saleItemsTotal(s), 0);

    const pendingPayrollTotal = sales
      .filter(
        (s) =>
          s.payment_type !== "immediate" &&
          !s.payroll_processed &&
          !s.refunded,
      )
      .reduce((acc, s) => acc + saleItemsTotal(s), 0);

    return {
      totalRevenue,
      revenueBySede,
      pendingBySede,
      inventoryBySede,
      totalProducts,
      lowStockProducts,
      outOfStock,
      processedPayrollTotal,
      pendingPayrollTotal,
      totalSalesCount: sales.length,
      pendingPayrollCount,
    };
  }, [sales, products]);
}
