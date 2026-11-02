import { useMemo, useState } from "react";
import type { AdminSedeFilter } from "../../../../config/locations";
import { useAdminData } from "../../../../hooks/useAdminData";
import type { SaleItemDetail } from "../../../../types";

export function useAdminConsumers(sedeFilter: AdminSedeFilter = "ALL") {
  const adminData = useAdminData(true, sedeFilter);
  const { fullConsumersSummary, sales, statusFilter, paymentMethodFilter, searchQuery } = adminData;

  const [view, setView] = useState<"summary" | "detailed">("summary");
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(
    null,
  );
  const [selectedSales, setSelectedSales] = useState<string[]>([]);

  const selectedConsumer = useMemo(
    () => fullConsumersSummary.find((c) => c.email === selectedUserEmail),
    [fullConsumersSummary, selectedUserEmail],
  );

  const detailedSales = useMemo(() => {
    if (!selectedUserEmail) return [];
    return sales.filter((s) => {
      const matchesUser = s.users.email === selectedUserEmail;
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "pending"
            ? (s.payment_type !== "immediate" && !s.payroll_processed && !s.refunded) ||
              (s.payment_type === "immediate" && !s.sale_items.every((item) => item.entrepreneur_processed || item.refunded) && !s.refunded)
            : statusFilter === "paid"
              ? s.payment_type === "immediate" && s.sale_items.every((item) => item.entrepreneur_processed || item.refunded) && !s.refunded
              : statusFilter === "refunded"
                ? s.refunded === true || s.sale_items.every((item) => item.refunded)
                : s.payment_type !== "immediate" && s.payroll_processed;
      const matchesPaymentType =
        paymentMethodFilter === "all"
          ? true
          : paymentMethodFilter === "credit"
            ? s.payment_type !== "immediate"
            : s.payment_type === "immediate" && s.payment_method === paymentMethodFilter;
      const matchesSearch =
        s.sale_items.some((item: SaleItemDetail) =>
          item.products.name.toLowerCase().includes(searchQuery.toLowerCase()),
        ) || s.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesUser && matchesStatus && matchesPaymentType && matchesSearch;
    });
  }, [sales, selectedUserEmail, statusFilter, paymentMethodFilter, searchQuery]);

  const toggleSaleSelection = (saleId: string) => {
    setSelectedSales((prev) =>
      prev.includes(saleId)
        ? prev.filter((id) => id !== saleId)
        : [...prev, saleId],
    );
  };

  const toggleAllVisible = () => {
    const pendingSalesIds = detailedSales
      .filter((s) => s.payment_type !== "immediate" && !s.payroll_processed && !s.refunded)
      .map((s) => s.id);
    setSelectedSales(
      selectedSales.length === pendingSalesIds.length ? [] : pendingSalesIds,
    );
  };

  const handleBackToSummary = () => {
    adminData.setSearchQuery("");
    setView("summary");
    setSelectedUserEmail(null);
    setSelectedSales([]);
  };

  const resetScopeState = () => {
    setView("summary");
    setSelectedUserEmail(null);
    setSelectedSales([]);
    adminData.clearSelection();
  };

  return {
    ...adminData,
    view,
    setView,
    selectedUserEmail,
    setSelectedUserEmail,
    selectedSales,
    setSelectedSales,
    selectedConsumer,
    detailedSales,
    toggleSaleSelection,
    toggleAllVisible,
    handleBackToSummary,
    resetScopeState,
  };
}
