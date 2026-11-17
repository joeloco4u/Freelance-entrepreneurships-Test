import { useParams } from "react-router-dom";
import { useProducts } from "../../../../hooks/useProducts";
import { useSales } from "../../../../hooks/useSales";
import { useOverviewStats } from "./hooks/useOverviewStats";
import InventoryAndTips from "./InventoryAndTips";
import ProductTableSkeleton from "./products/ProductTableSkeleton";
import StatsGrid from "./StatsGrid";
import WelcomeHeader from "./WelcomeHeader";

export default function EntrepreneurshipOverview() {
  const { id } = useParams<{ id: string }>();

  const { allSales, loading: loadingSales } = useSales(id);
  const { allProducts, loading: loadingProducts } = useProducts(id);

  const stats = useOverviewStats(allSales, allProducts);

  if (loadingSales || loadingProducts) return <ProductTableSkeleton />;
  if (!id) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <WelcomeHeader id={id} />

      <StatsGrid
        revenue={stats.totalRevenue}
        pendingPayrollTotal={stats.pendingPayrollTotal}
        processedPayrollTotal={stats.processedPayrollTotal}
        revenueBySede={stats.revenueBySede}
        pendingBySede={stats.pendingBySede}
      />

      <InventoryAndTips
        id={id}
        totalProducts={stats.totalProducts}
        lowStock={stats.lowStockProducts}
        outOfStock={stats.outOfStock}
        inventoryBySede={stats.inventoryBySede}
      />
    </div>
  );
}
