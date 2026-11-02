import { useMemo, useState } from "react";
import type { AdminSedeFilter } from "../../../../config/locations";
import { useAdminData } from "../../../../hooks/useAdminData";
import type { SaleItemDetail } from "../../../../types";

export const useAdminEntrepreneurs = (sedeFilter: AdminSedeFilter = "ALL") => {
  const adminData = useAdminData(true, sedeFilter);
  const [view, setView] = useState<"summary" | "detailed">("summary");
  const [selectedEntId, setSelectedEntId] = useState<string | null>(null);

  const selectedEntrepreneur = useMemo(
    () =>
      adminData.fullEntrepreneursSummary.find((e) => e.id === selectedEntId),
    [adminData.fullEntrepreneursSummary, selectedEntId],
  );

  const detailedSales = useMemo(() => {
    if (!selectedEntId) return [];
    const filtered = adminData.sales.filter((s) =>
      s.sale_items.some(
        (item: SaleItemDetail) =>
          item.products.entrepreneurships.id === selectedEntId,
      ),
    );
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return adminData.sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });
  }, [adminData.sales, selectedEntId, adminData.sortOrder]);

  const toggleAllVisible = () => {
    const pendingSalesIds = detailedSales
      .filter((s) => s.payment_type !== "immediate" && !s.payroll_processed && !s.refunded)
      .map((s) => s.id);

    if (adminData.selectedSales.length === pendingSalesIds.length) {
      adminData.setSelectedSales([]);
    } else {
      adminData.setSelectedSales(pendingSalesIds);
    }
  };

  const handleBackToSummary = () => {
    adminData.setSearchQuery("");
    adminData.clearSelection();
    setView("summary");
    setSelectedEntId(null);
  };

  const handleSelectEntrepreneur = (id: string) => {
    adminData.setSearchQuery("");
    adminData.clearSelection();
    setSelectedEntId(id);
    setView("detailed");
  };

  const resetScopeState = () => {
    setView("summary");
    setSelectedEntId(null);
    adminData.clearSelection();
  };

  return {
    ...adminData,
    view,
    selectedEntrepreneur,
    detailedSales,
    selectedEntId,
    toggleAllVisible,
    handleBackToSummary,
    handleSelectEntrepreneur,
    resetScopeState,
  };
};
