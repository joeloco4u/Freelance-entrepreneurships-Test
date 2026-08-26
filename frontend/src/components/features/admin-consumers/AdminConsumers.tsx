import { useCallback, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "react-toastify";
import { SummaryEmptyState } from "../admin-entrepreneurs/SummaryEmptyState";
import DetailedSalesStats from "../../shared/DetailedSalesStats";
import { AdminConsumersSkeleton } from "./AdminConsumersSkeleton";
import { BulkActionBanner } from "./BulkActionBanner";
import { ConsumerDetailedDesktop } from "./ConsumerDetailedDesktop";
import { ConsumerDetailedMobile } from "./ConsumerDetailedMobile";
import { ConsumersDesktop } from "./ConsumersDesktop";
import { ConsumersFilters } from "./ConsumersFilter";
import { ConsumersHeader } from "./ConsumersHeader";
import { ConsumersMobile } from "./ConsumersMobile";
import { useAdminConsumers } from "./hooks/useAdminConsumers";
import RefundSaleModal from "../my-entrepreneurships/EntrepreneurShipsMenu/sales/RefundSaleModal";
import { refundSale } from "../../../services/saleService";
import type { GlobalSale } from "../../../types";
import { exportSalesToExcel } from "../../../utils/exportToExcel";
import { getErrorMessage } from "../../../utils/errorMessage";
import { ERROR_MESSAGES } from "../../../constants/errorMessages";

export default function AdminConsumers() {
  const {
    consumersSummary,
    detailedSales,
    view,
    setView,
    selectedSales,
    setSelectedSales,
    selectedConsumer,
    setSelectedUserEmail,
    loading,
    processingIds,
    setProcessingIds,
    processPayroll,
    markItemsRefunded,
    refetch,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    selectedMonth,
    setSelectedMonth,
    dateRange,
    setDateRange,
    toggleSaleSelection,
    toggleAllVisible,
    handleBackToSummary,
  } = useAdminConsumers();

  const [refundingSale, setRefundingSale] = useState<GlobalSale | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);

  const handleRefund = useCallback((sale: GlobalSale) => {
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
        setProcessingIds((prev: string[]) => [...prev, refundingSale.id]);
        const result = await refundSale(refundingSale.id, { item_ids: itemIds });
        if (result.type === "full") {
          toast.success("Venta reembolsada correctamente");
        } else {
          toast.success("Items reembolsados correctamente");
        }
        markItemsRefunded(refundingSale.id, itemIds);
        setRefundingSale(null);
        setSelectedSales((prev: string[]) => prev.filter((id) => id !== refundingSale.id));
        refetch(true);
      } catch (error) {
        const errorMessage =
          getErrorMessage(error, ERROR_MESSAGES.sales.refund);
        toast.error(errorMessage);
      } finally {
        setIsRefunding(false);
        setProcessingIds((prev: string[]) => prev.filter((id) => id !== refundingSale?.id));
      }
    },
    [refundingSale, markItemsRefunded, refetch, setProcessingIds, setSelectedSales],
  );

  const handleExport = () => {
    if (!detailedSales.length) return;
    exportSalesToExcel(detailedSales, selectedConsumer?.name ?? "compras");
  };

  if (loading) return <AdminConsumersSkeleton />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 md:pb-0">
      <ConsumersHeader
        view={view}
        selectedConsumerName={selectedConsumer?.name}
        onBack={handleBackToSummary}
      />

      {view === "detailed" && detailedSales.length > 0 && (
        <DetailedSalesStats sales={detailedSales} />
      )}

      <ConsumersFilters
        view={view}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        paymentMethodFilter={paymentMethodFilter}
        setPaymentMethodFilter={setPaymentMethodFilter}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        dateRange={dateRange}
        setDateRange={setDateRange}
        exportButton={
          view === "detailed" && (
            <button
              type="button"
              onClick={handleExport}
              disabled={detailedSales.length === 0}
              className="cursor-pointer flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-xl border border-primary/20 hover:border-primary/30 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Download size={14} />
              Exportar Excel
            </button>
          )
        }
      />

      <BulkActionBanner
        count={selectedSales.length}
        isProcessing={processingIds.length > 0}
        onProcess={async () => {
          await processPayroll(selectedSales);
          setSelectedSales([]);
        }}
      />

      <div className="min-h-100">
        {view === "summary" ? (
          <div className="grid grid-cols-1 gap-4 md:bg-white md:rounded-3xl md:border md:border-gray-100 md:shadow-sm overflow-hidden">
            {consumersSummary.length === 0 ? (
              <SummaryEmptyState query={searchQuery} />
            ) : (
              <>
                <ConsumersDesktop
                  data={consumersSummary}
                  onSelect={(email) => {
                    setSearchQuery("");
                    setSelectedUserEmail(email);
                    setView("detailed");
                  }}
                />
                <ConsumersMobile
                  data={consumersSummary}
                  onSelect={(email) => {
                    setSearchQuery("");
                    setSelectedUserEmail(email);
                    setView("detailed");
                  }}
                />
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4 md:bg-white md:rounded-3xl md:border md:border-gray-100 md:shadow-sm overflow-hidden animate-in slide-in-from-right duration-300">
            {detailedSales.length === 0 ? (
              <SummaryEmptyState query={searchQuery} />
            ) : (
              <>
                <ConsumerDetailedDesktop
                  sales={detailedSales}
                  selectedSales={selectedSales}
                  toggleSelection={toggleSaleSelection}
                  toggleAll={toggleAllVisible}
                  onProcessSingle={(id) => processPayroll([id])}
                  onRefund={handleRefund}
                  processingIds={processingIds}
                />
                <ConsumerDetailedMobile
                  sales={detailedSales}
                  selectedSales={selectedSales}
                  toggleSelection={toggleSaleSelection}
                  onProcessSingle={(id) => processPayroll([id])}
                  onRefund={handleRefund}
                  processingIds={processingIds}
                />
              </>
            )}
          </div>
        )}
      </div>

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
    </div>
  );
}
