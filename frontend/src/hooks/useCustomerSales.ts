import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify/unstyled";
import { supabase } from "../config/supabaseClient";
import { getConsumerPurchases } from "../services/saleService";
import type { ConsumerSale, DateRange } from "../types";
import { getErrorMessage } from "../utils/errorMessage";

function getSaleStatus(sale: ConsumerSale) {
  if (sale.refunded || sale.sale_items.every((item) => item.refunded)) return "refunded";
  if (sale.payment_type === "immediate") {
    const allProcessed = sale.sale_items.every((item) => item.entrepreneur_processed || item.refunded);
    if (allProcessed) return "paid";
    const someProcessed = sale.sale_items.some((item) => item.entrepreneur_processed);
    if (someProcessed) return "partial";
    return "pending";
  }
  if (sale.payroll_processed) return "processed";
  return "pending";
}

export const useConsumerSales = () => {
  const [sales, setSales] = useState<ConsumerSale[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<"all" | "credit" | "efectivo" | "binance" | "pago_movil">("all");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  const fetchMySales = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      const data = await getConsumerPurchases(session.user.id);
      setSales(data);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "No se pudieron cargar tus compras. Verifica tu conexión e intenta de nuevo."),
      );
    } finally {
      setLoading(false);
    }
  };

  // 2. Lógica de filtrado con useMemo para optimizar rendimiento
  const filteredSales = useMemo(() => {
    let result = sales;

    if (selectedMonth !== null) {
      const currentYear = new Date().getFullYear();
      result = result.filter((sale) => {
        const saleDate = new Date(sale.created_at);
        return (
          saleDate.getMonth() === selectedMonth &&
          saleDate.getFullYear() === currentYear
        );
      });
    }

    if (dateRange !== null) {
      result = result.filter((sale) => {
        const saleDate = new Date(sale.created_at);
        return saleDate >= dateRange.start && saleDate <= dateRange.end;
      });
    }

    if (statusFilter !== "all") {
      result = result.filter((sale) => getSaleStatus(sale) === statusFilter);
    }

    if (paymentMethodFilter !== "all") {
      if (paymentMethodFilter === "credit") {
        result = result.filter((sale) => sale.payment_type !== "immediate");
      } else {
        result = result.filter(
          (sale) =>
            sale.payment_type === "immediate" &&
            sale.payment_method === paymentMethodFilter,
        );
      }
    }

    if (!searchQuery.trim()) return result;

    const lowerQuery = searchQuery.toLowerCase();

    return result.filter((sale) => {
      const matchesItem = sale.sale_items.some(
        (item) =>
          item.products.name.toLowerCase().includes(lowerQuery) ||
          item.products.entrepreneurships.name
            .toLowerCase()
            .includes(lowerQuery),
      );

      const matchesId = sale.id.toLowerCase().includes(lowerQuery);

      return matchesItem || matchesId;
    });
  }, [sales, searchQuery, statusFilter, paymentMethodFilter, selectedMonth, dateRange]);

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (cancelled || !session?.user) return;
        return getConsumerPurchases(session.user.id);
      })
      .then((data) => {
        if (cancelled || !data) return;
        setSales(data);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(
          getErrorMessage(error, "No se pudieron cargar tus compras. Verifica tu conexión e intenta de nuevo."),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 3. Retornamos los nuevos estados
  return {
    sales: filteredSales,
    rawSales: sales,
    loading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    selectedMonth,
    setSelectedMonth,
    paymentMethodFilter,
    setPaymentMethodFilter,
    dateRange,
    setDateRange,
    refresh: fetchMySales,
  };
};
