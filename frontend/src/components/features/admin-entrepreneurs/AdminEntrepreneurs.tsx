import { useCallback, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "react-toastify";
import ConfirmationModal from "../../shared/ConfirmationModal";
import DetailedSalesStats from "../../shared/DetailedSalesStats";
import { AdminConsumersSkeleton } from "../admin-consumers/AdminConsumersSkeleton";
import { BulkActionBanner } from "./BulkActionBanner";
import { DetailedView } from "./DetailedView";
import { EntrepreneursFilters } from "./EntrepreneursFilters";
import { EntrepreneursHeader } from "./EntrepreneursHeader";
import { useAdminEntrepreneurs } from "./hooks/useAdminEntrepreneurs";
import { SummaryView } from "./SummaryView";
import RefundSaleModal from "../my-entrepreneurships/EntrepreneurShipsMenu/sales/RefundSaleModal";
import { refundSale } from "../../../services/saleService";
import type { GlobalSale } from "../../../types";
import { exportSalesToExcel } from "../../../utils/exportToExcel";
import { getErrorMessage } from "../../../utils/errorMessage";
import { ERROR_MESSAGES } from "../../../constants/errorMessages";
import type { AdminSedeFilter } from "../../../config/locations";
import { MOCK_MODE } from "../../../config/mockMode";

export default function AdminEntrepreneurs() {
  const [sedeFilter, setSedeFilter] = useState<AdminSedeFilter>("ALL");
  const logic = useAdminEntrepreneurs(sedeFilter);

  const [refundingSale, setRefundingSale] = useState<GlobalSale | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);

  const handleSedeFilterChange = (next: AdminSedeFilter) => {
    logic.resetScopeState();
    setRefundingSale(null);
    setIsRefunding(false);
    setSedeFilter(next);
  };

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

      if (MOCK_MODE) {
        const allRefunded = refundingSale.sale_items.every(
          (item) => item.refunded || itemIds.includes(item.id),
        );
        logic.markItemsRefunded(refundingSale.id, itemIds);
        if (allRefunded) {
          toast.success("Venta reembolsada correctamente");
        } else {
          toast.success("Items reembolsados correctamente");
        }
        setRefundingSale(null);
        logic.setSelectedSales((prev: string[]) => prev.filter((id) => id !== refundingSale.id));
        return;
      }

      try {
        setIsRefunding(true);
        logic.setProcessingIds((prev: string[]) => [...prev, refundingSale.id]);
        const result = await refundSale(refundingSale.id, { item_ids: itemIds });
        if (result.type === "full") {
          toast.success("Venta reembolsada correctamente");
        } else {
          toast.success("Items reembolsados correctamente");
        }
        logic.markItemsRefunded(refundingSale.id, itemIds);
        setRefundingSale(null);
        logic.setSelectedSales((prev: string[]) => prev.filter((id) => id !== refundingSale.id));
        logic.refetch(true);
      } catch (error) {
        const errorMessage =
          getErrorMessage(error, ERROR_MESSAGES.sales.refund);
        toast.error(errorMessage);
      } finally {
        setIsRefunding(false);
        logic.setProcessingIds((prev: string[]) => prev.filter((id) => id !== refundingSale?.id));
      }
    },
    [refundingSale, logic],
  );

  const handleExport = () => {
    if (!logic.detailedSales.length) return;
    exportSalesToExcel(
      logic.detailedSales,
      logic.selectedEntrepreneur?.name ?? "ventas",
      logic.selectedEntId ?? undefined,
    );
  };

  if (logic.loading) return <AdminConsumersSkeleton />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 md:pb-0 scrollbar-gutter:stable">
      <EntrepreneursHeader
        view={logic.view}
        entrepreneurName={logic.selectedEntrepreneur?.name}
        onBack={logic.handleBackToSummary}
      />

      {logic.view === "detailed" && logic.detailedSales.length > 0 && (
        <DetailedSalesStats sales={logic.detailedSales} selectedEntId={logic.selectedEntId!} />
      )}

      <EntrepreneursFilters
        view={logic.view}
        searchQuery={logic.searchQuery}
        setSearchQuery={logic.setSearchQuery}
        statusFilter={logic.statusFilter}
        setStatusFilter={logic.setStatusFilter}
        paymentMethodFilter={logic.paymentMethodFilter}
        setPaymentMethodFilter={logic.setPaymentMethodFilter}
        selectedMonth={logic.selectedMonth}
        setSelectedMonth={logic.setSelectedMonth}
        dateRange={logic.dateRange}
        setDateRange={logic.setDateRange}
        exportButton={
          logic.view === "detailed" && (
            <button
              type="button"
              onClick={handleExport}
              disabled={logic.detailedSales.length === 0}
              className="cursor-pointer flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-xl border border-primary/20 hover:border-primary/30 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Download size={14} />
              Exportar Excel
            </button>
          )
        }
      />

      {logic.selectedSales.length > 0 && (
        <BulkActionBanner
          count={logic.selectedSales.length}
          onProcess={() => logic.openProcessPayroll(logic.selectedSales)}
          isLoading={logic.modalProps.isLoading}
        />
      )}

      <div className="min-h-100">
        {logic.view === "summary" ? (
          <SummaryView
            data={logic.entrepreneursSummary}
            onSelect={logic.handleSelectEntrepreneur}
            searchQuery={logic.searchQuery}
            sedeFilter={sedeFilter}
            onSedeFilterChange={handleSedeFilterChange}
            hasLocationData={logic.hasLocationData}
          />
        ) : (
          <DetailedView
            sales={logic.detailedSales}
            selectedSales={logic.selectedSales}
            toggleSelection={logic.toggleSaleSelection}
            toggleAll={logic.toggleAllVisible}
            onProcessSingle={(id) => logic.openProcessPayroll([id])}
            onRefund={handleRefund}
            sortOrder={logic.sortOrder}
            setSortOrder={logic.setSortOrder}
            processingIds={logic.processingIds}
            searchQuery={logic.searchQuery}
            selectedEntId={logic.selectedEntId}
            sedeFilter={sedeFilter}
            onSedeFilterChange={handleSedeFilterChange}
            hasLocationData={logic.hasLocationData}
          />
        )}
      </div>

      <ConfirmationModal {...logic.modalProps} type="info" />

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
