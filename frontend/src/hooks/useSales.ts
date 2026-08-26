import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  getSalesByEntrepreneurship,
} from "../services/saleService";
import type { DateRange, EntrepreneurshipSale } from "../types";
import { getErrorMessage } from "../utils/errorMessage";
import { ERROR_MESSAGES } from "../constants/errorMessages";

export function useSales(entrepreneurshipId?: string) {
  const [sales, setSales] = useState<EntrepreneurshipSale[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Estados de Filtros y Ordenamiento ---
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc"); // date-desc, date-asc, total-desc, total-asc
  const [statusFilter, setStatusFilter] = useState("all"); // all, processed, pending
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<"all" | "credit" | "efectivo" | "binance" | "pago_movil">("all");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  // 1. Carga de datos desde la API
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!entrepreneurshipId) return;

      try {
        setLoading(true);
        const data = await getSalesByEntrepreneurship(entrepreneurshipId);
        if (!cancelled) setSales(data);
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching sales:", error);
          const errorMessage = getErrorMessage(error, ERROR_MESSAGES.sales.load);
          toast.error(errorMessage);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [entrepreneurshipId]);

  const refetch = useCallback(async () => {
    if (!entrepreneurshipId) return;

    try {
      setLoading(true);
      const data = await getSalesByEntrepreneurship(entrepreneurshipId);
      setSales(data);
    } catch (error) {
      console.error("Error fetching sales:", error);
      const errorMessage = getErrorMessage(error, ERROR_MESSAGES.sales.load);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [entrepreneurshipId]);

  const markItemsRefunded = useCallback((saleId: string, itemIds: number[]) => {
    setSales((prev) =>
      prev.map((sale) => {
        if (sale.id !== saleId) return sale;
        const updatedItems = sale.sale_items.map((item) =>
          itemIds.includes(item.id) ? { ...item, refunded: true } : item,
        );
        const allRefunded = updatedItems.every((item) => item.refunded);
        return {
          ...sale,
          sale_items: updatedItems,
          refunded: allRefunded ? true : sale.refunded,
        };
      }),
    );
  }, []);

  const markItemsProcessed = useCallback((saleId: string, itemIds: number[]) => {
    setSales((prev) =>
      prev.map((sale) => {
        if (sale.id !== saleId) return sale;
        return {
          ...sale,
          sale_items: sale.sale_items.map((item) =>
            itemIds.includes(item.id)
              ? { ...item, entrepreneur_processed: true }
              : item,
          ),
        };
      }),
    );
  }, []);

  // 2. Lógica de Filtrado y Ordenamiento (Computed State)
  // Usamos useMemo para que solo se recalcule cuando cambien los datos o los filtros
  const filteredSales = useMemo(() => {
    let result = [...sales];

    // --- A. Búsqueda Multicriterio ---
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((sale) => {
        // Buscar en nombre del cliente
        const matchCustomer = sale.users?.name.toLowerCase().includes(query);

        // Buscar en email del cliente
        const matchEmail = sale.users?.email.toLowerCase().includes(query);

        // Buscar en la lista de productos de esa venta
        const matchProduct = sale.sale_items?.some((item) =>
          item.products.name.toLowerCase().includes(query),
        );

        return matchCustomer || matchEmail || matchProduct;
      });
    }

    // --- B. Filtro por Rango de Fechas ---
    if (dateRange) {
      result = result.filter((sale) => {
        const saleDate = new Date(sale.created_at);
        return saleDate >= dateRange.start && saleDate <= dateRange.end;
      });
    }

    // --- C. Filtro por Estado ---
    if (statusFilter !== "all") {
      if (statusFilter === "refunded") {
        result = result.filter(
          (sale) =>
            sale.refunded === true ||
            sale.sale_items.every((item) => item.refunded),
        );
      } else if (statusFilter === "processed") {
        result = result.filter((sale) => {
          const allRefunded = sale.sale_items.every((item) => item.refunded);
          if (sale.refunded || allRefunded) return false;
          if (sale.payment_type === "immediate") {
            return sale.sale_items.every(
              (item) => item.entrepreneur_processed || item.refunded,
            );
          }
          return sale.payroll_processed === true;
        });
      } else {
        // pending
        result = result.filter((sale) => {
          const allRefunded = sale.sale_items.every((item) => item.refunded);
          if (sale.refunded || allRefunded) return false;
          if (sale.payment_type === "immediate") {
            return sale.sale_items.some(
              (item) => !item.entrepreneur_processed && !item.refunded,
            );
          }
          return sale.payroll_processed === false;
        });
      }
    }

    // --- D. Filtro por Tipo/Método de Pago ---
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

    // --- E. Ordenamiento ---
    result = result.toSorted((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case "date-asc":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case "total-desc":
          return b.total - a.total;
        case "total-asc":
          return a.total - b.total;
        default:
          return 0;
      }
    });

    return result;
  }, [sales, searchQuery, sortBy, statusFilter, paymentMethodFilter, dateRange]);

  return {
    // Datos
    sales: filteredSales, // Lista ya procesada para la tabla
    allSales: sales, // Datos crudos sin filtrar (útil para exportación)
    originalSalesCount: sales.length, // Para saber si el emprendimiento tiene ventas en total
    loading,

    // Setters de filtros para los componentes de UI
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

    // Acciones
    markItemsRefunded,
    markItemsProcessed,
    refetch,
  };
}
