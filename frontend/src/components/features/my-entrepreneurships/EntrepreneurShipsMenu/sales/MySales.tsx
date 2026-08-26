import { useCallback, useMemo, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { Download } from "lucide-react";
import { toast } from "react-toastify";
import { useSales } from "../../../../../hooks/useSales";
import { processSaleItems, refundSale, refundSalesBatch } from "../../../../../services/saleService";
import type { Entrepreneurship, EntrepreneurshipSale } from "../../../../../types";
import { exportSalesToExcel } from "../../../../../utils/exportToExcel";
import ConfirmationModal from "../../../../shared/ConfirmationModal";
import ProductTableSkeleton from "../products/ProductTableSkeleton";
import { BulkRefundBanner } from "./BulkRefundBanner";
import ProcessItemsModal from "./ProcessItemsModal";
import RefundSaleModal from "./RefundSaleModal";
import SalesCardsMobile from "./SalesCardMobile";
import SalesEmptyState from "./SalesEmptyState";
import SalesFilters from "./SalesFilters";
import SalesSummary from "./SalesSummary";
import SalesTableDesktop from "./SalesTableDesktop";
import { getErrorMessage } from "../../../../../utils/errorMessage";
import { ERROR_MESSAGES } from "../../../../../constants/errorMessages";

export default function MySales() {
  const { id } = useParams<{ id: string }>();
  const { biz } = useOutletContext<{ biz: Entrepreneurship | null }>();
  const {
    sales,
    loading,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    statusFilter,
    setStatusFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    dateRange,
    setDateRange,
    markItemsRefunded,
    markItemsProcessed,
    refetch,
  } = useSales(id);

  const [refundingSale, setRefundingSale] =
    useState<EntrepreneurshipSale | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);

  const [processingSale, setProcessingSale] =
    useState<EntrepreneurshipSale | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [selectedSales, setSelectedSales] = useState<string[]>([]);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkModalConfig, setBulkModalConfig] = useState({ title: "", message: "" });
  const [idsToBulkRefund, setIdsToBulkRefund] = useState<string[]>([]);

  const handleExport = () => {
    if (!sales.length) return;
    exportSalesToExcel(sales, biz?.name ?? "ventas");
  };

  const refundableSales = useMemo(() => {
    return sales.filter((sale) => {
      const allItemsRefunded = sale.sale_items.every((item) => item.refunded);
      const isEffectivelyRefunded = sale.refunded || allItemsRefunded;
      return !sale.payroll_processed && !isEffectivelyRefunded;
    });
  }, [sales]);

  const toggleSelection = useCallback((saleId: string) => {
    setSelectedSales((prev) =>
      prev.includes(saleId)
        ? prev.filter((id) => id !== saleId)
        : [...prev, saleId],
    );
  }, []);

  const toggleAllVisible = useCallback(() => {
    const refundableIds = refundableSales.map((s) => s.id);
    if (selectedSales.length === refundableIds.length && refundableIds.length > 0) {
      setSelectedSales([]);
    } else {
      setSelectedSales(refundableIds);
    }
  }, [refundableSales, selectedSales.length]);

  const openBulkRefund = useCallback(() => {
    if (selectedSales.length === 0) return;

    setIdsToBulkRefund(selectedSales);
    const isMultiple = selectedSales.length > 1;

    setBulkModalConfig({
      title: isMultiple
        ? "Reembolsar selección masiva"
        : "Reembolsar venta individual",
      message: isMultiple
        ? `¿Estás seguro de que deseas reembolsar las ${selectedSales.length} ventas seleccionadas? Se reembolsarán TODOS los items de tus emprendimientos en cada venta. Esta acción no se puede deshacer.`
        : "¿Estás seguro de que deseas reembolsar esta venta? Se reembolsarán TODOS los items de tu emprendimiento en esta venta.",
    });

    setIsBulkModalOpen(true);
  }, [selectedSales]);

  const handleConfirmBulkRefund = useCallback(async () => {
    if (idsToBulkRefund.length === 0) return;

    try {
      setProcessingIds((prev) => [...prev, ...idsToBulkRefund]);
      const result = await refundSalesBatch(idsToBulkRefund);

      const successCount = result.results.filter((r) => r.success).length;
      const failedCount = result.results.filter((r) => !r.success).length;

      if (failedCount > 0 && successCount > 0) {
        toast.warning(`${successCount} ventas reembolsadas, ${failedCount} fallidas`);
      } else if (failedCount > 0) {
        toast.error(`No se pudieron reembolsar ${failedCount} venta${failedCount === 1 ? "" : "s"}`);
      } else {
        toast.success(`${successCount} venta${successCount === 1 ? "" : "s"} reembolsada${successCount === 1 ? "" : "s"} correctamente`);
      }

      refetch();
      setSelectedSales((prev) => prev.filter((id) => !idsToBulkRefund.includes(id)));
      setIsBulkModalOpen(false);
    } catch (error: unknown) {
      console.error("Error al procesar reembolsos masivos:", error);
      const errorMessage = getErrorMessage(error, ERROR_MESSAGES.sales.refundBatch);
      toast.error(errorMessage);
    } finally {
      setProcessingIds((prev) => prev.filter((id) => !idsToBulkRefund.includes(id)));
      setIdsToBulkRefund([]);
    }
  }, [idsToBulkRefund, refetch]);

  const handleProcessPayment = useCallback((sale: EntrepreneurshipSale) => {
    setProcessingSale(sale);
  }, []);

  const handleCloseProcessPayment = useCallback(() => {
    setProcessingSale(null);
    setIsProcessingPayment(false);
  }, []);

  const handleConfirmProcessPayment = useCallback(
    async (itemIds: number[]) => {
      if (!processingSale) return;
      try {
        setIsProcessingPayment(true);
        setProcessingIds((prev) => [...prev, processingSale.id]);
        await processSaleItems(processingSale.id, itemIds);
        markItemsProcessed(processingSale.id, itemIds);
        toast.success("Items marcados como pagados correctamente");
        setProcessingSale(null);
        refetch();
      } catch (error) {
        const errorMessage =
          getErrorMessage(error, ERROR_MESSAGES.sales.payment);
        toast.error(errorMessage);
      } finally {
        setIsProcessingPayment(false);
        setProcessingIds((prev) =>
          prev.filter((id) => id !== processingSale?.id),
        );
      }
    },
    [processingSale, markItemsProcessed, refetch],
  );

  const handleRefund = useCallback((sale: EntrepreneurshipSale) => {
    setRefundingSale(sale);
  }, []);

  const handleCloseRefund = useCallback(() => {
    setRefundingSale(null);
    setIsRefunding(false);
  }, []);

  const handleConfirmRefund = useCallback(
    async (itemIds: number[]) => {
      if (!refundingSale) return;
      try {
        setIsRefunding(true);
        setProcessingIds((prev) => [...prev, refundingSale.id]);
        const result = await refundSale(refundingSale.id, {
          item_ids: itemIds,
        });
        if (result.type === "full") {
          toast.success("Venta reembolsada correctamente");
        } else {
          toast.success("Items reembolsados correctamente");
        }
        markItemsRefunded(refundingSale.id, itemIds);
        setRefundingSale(null);
        setSelectedSales((prev) => prev.filter((id) => id !== refundingSale.id));
        refetch();
      } catch (error) {
        const errorMessage =
          getErrorMessage(error, ERROR_MESSAGES.sales.refund);
        toast.error(errorMessage);
      } finally {
        setIsRefunding(false);
        setProcessingIds((prev) => prev.filter((id) => id !== refundingSale?.id));
      }
    },
    [refundingSale, markItemsRefunded, refetch],
  );

  const filteredTotalRevenue = useMemo(
    () =>
      sales.reduce(
        (acc, s) =>
          acc + s.sale_items.reduce((sum, item) => sum + item.subtotal, 0),
        0,
      ),
    [sales],
  );

  if (loading) return <ProductTableSkeleton />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 md:pb-0">
      <SalesSummary
        totalSales={sales.length}
        totalRevenue={filteredTotalRevenue}
      />

      <SalesFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        paymentMethodFilter={paymentMethodFilter}
        onPaymentMethodChange={setPaymentMethodFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        exportButton={
          <button
            type="button"
            onClick={handleExport}
            disabled={sales.length === 0}
            className="cursor-pointer flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-xl border border-primary/20 hover:border-primary/30 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Download size={14} />
            Exportar Excel
          </button>
        }
      />

      {selectedSales.length > 0 && (
        <BulkRefundBanner
          count={selectedSales.length}
          onRefund={openBulkRefund}
          isLoading={processingIds.length > 0}
        />
      )}

      {sales.length === 0 ? (
        <SalesEmptyState
          isFiltering={!!searchQuery || statusFilter !== "all" || paymentMethodFilter !== "all" || !!dateRange}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <SalesTableDesktop
              sales={sales}
              onRefund={handleRefund}
              onProcessPayment={handleProcessPayment}
              selectedSales={selectedSales}
              toggleSelection={toggleSelection}
              toggleAll={toggleAllVisible}
              processingIds={processingIds}
            />
          </div>
          <div className="md:hidden">
            <SalesCardsMobile
              sales={sales}
              onRefund={handleRefund}
              onProcessPayment={handleProcessPayment}
              selectedSales={selectedSales}
              toggleSelection={toggleSelection}
              processingIds={processingIds}
            />
          </div>
        </>
      )}

      {refundingSale && (
        <RefundSaleModal
          isOpen={true}
          onClose={handleCloseRefund}
          onConfirm={handleConfirmRefund}
          isLoading={isRefunding}
          saleItems={refundingSale.sale_items}
          saleTotal={refundingSale.total}
          saleId={refundingSale.id}
        />
      )}

      {processingSale && (
        <ProcessItemsModal
          isOpen={true}
          onClose={handleCloseProcessPayment}
          onConfirm={handleConfirmProcessPayment}
          isLoading={isProcessingPayment}
          saleItems={processingSale.sale_items}
          saleId={processingSale.id}
        />
      )}

      <ConfirmationModal
        isOpen={isBulkModalOpen}
        onClose={() => processingIds.length === 0 && setIsBulkModalOpen(false)}
        onConfirm={handleConfirmBulkRefund}
        title={bulkModalConfig.title}
        message={bulkModalConfig.message}
        confirmText="Si, reembolsar"
        type="danger"
        isLoading={processingIds.length > 0}
      />
    </div>
  );
}
