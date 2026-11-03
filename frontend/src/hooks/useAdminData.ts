import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  LOCATION_CODES,
  type AdminSedeFilter,
  type LocationCode,
} from "../config/locations";
import { updatePayrollStatusBatch } from "../services/adminService";
import { getAllSales } from "../services/saleService";
import {
  AppError,
  type ConsumerSummary,
  type DateRange,
  type EntrepreneurSummary,
  type GlobalSale,
} from "../types";
import { getErrorMessage } from "../utils/errorMessage";
import { ERROR_MESSAGES } from "../constants/errorMessages";

/**
 * @param enabled - Controla si el hook debe realizar la petición a la API.
 * Útil para evitar errores 403 en usuarios sin rol ADMIN/IT.
 * @param sedeFilter - Filtra las agregaciones por sede sin alterar los mapas de sedes.
 */
export function useAdminData(
  enabled: boolean = true,
  sedeFilter: AdminSedeFilter = "ALL",
) {
  const [sales, setSales] = useState<GlobalSale[]>([]);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<"all" | "credit" | "efectivo" | "binance" | "pago_movil">("all");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [idsToProcess, setIdsToProcess] = useState<string[]>([]);
  const [modalConfig, setModalConfig] = useState({ title: "", message: "" });
  const [selectedSales, setSelectedSales] = useState<string[]>([]);

  const scopedSales = useMemo(
    () =>
      sedeFilter === "ALL"
        ? sales
        : sales.filter((sale) => sale.location_id === sedeFilter),
    [sales, sedeFilter],
  );

  const hasLocationData = useMemo(
    () => sales.some((sale) => !!sale.location_id),
    [sales],
  );

  const sedesByEntrepreneur = useMemo(() => {
    const map: Record<string, Set<LocationCode>> = {};

    sales.forEach((sale) => {
      const locationId = sale.location_id;
      if (!locationId) return;

      sale.sale_items.forEach((item) => {
        const entId = item.products?.entrepreneurships?.id;
        if (!entId) return;
        if (!map[entId]) map[entId] = new Set();
        map[entId].add(locationId);
      });
    });

    const result: Record<string, LocationCode[]> = {};
    Object.entries(map).forEach(([entId, sedes]) => {
      result[entId] = LOCATION_CODES.filter((code) => sedes.has(code));
    });
    return result;
  }, [sales]);

  const sedesByConsumer = useMemo(() => {
    const map: Record<string, Set<LocationCode>> = {};

    sales.forEach((sale) => {
      const locationId = sale.location_id;
      if (!locationId) return;

      const email = sale.users?.email;
      if (!email) return;
      if (!map[email]) map[email] = new Set();
      map[email].add(locationId);
    });

    const result: Record<string, LocationCode[]> = {};
    Object.entries(map).forEach(([email, sedes]) => {
      result[email] = LOCATION_CODES.filter((code) => sedes.has(code));
    });
    return result;
  }, [sales]);

  const clearSelection = useCallback(() => {
    setSelectedSales([]);
    setIdsToProcess([]);
    setIsModalOpen(false);
  }, []);

  const fetchData = useCallback(
    async (isSilent = false) => {
      if (!enabled) {
        setLoading(false);
        return;
      }

      try {
        if (!isSilent) setLoading(true);
        const data = await getAllSales();
        setSales(data);
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(err, ERROR_MESSAGES.admin.dashboard);
        // El 403 es esperado para roles sin acceso al panel: no molestamos al usuario.
        if (!(err instanceof AppError) || err.status !== 403) {
          toast.error(errorMessage);
        }
        console.error("[useAdminData] fetchSales:", err);
      } finally {
        setLoading(false);
      }
    },
    [enabled],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
  }, [enabled, fetchData]);

  const openProcessPayroll = useCallback((ids: string[]) => {
    if (ids.length === 0) return;

    setIdsToProcess(ids);
    const isMultiple = ids.length > 1;

    setModalConfig({
      title: isMultiple
        ? "Liquidar selección masiva"
        : "Liquidar venta individual",
      message: isMultiple
        ? `¿Estás seguro de que deseas liquidar las ${ids.length} ventas seleccionadas? Esta acción no se puede deshacer.`
        : "¿Estás seguro de que deseas liquidar esta venta? Se marcará como procesada en el sistema.",
    });

    setIsModalOpen(true);
  }, []);

  const processPayroll = async (saleIds: string[]) => {
    if (saleIds.length === 0) return;

    try {
      setProcessingIds((prev) => [...prev, ...saleIds]);
      await updatePayrollStatusBatch(saleIds);
      toast.success("Registros actualizados correctamente");
      await fetchData(true);
      setSelectedSales((prev) => prev.filter((id) => !saleIds.includes(id)));
      setIsModalOpen(false);
    } catch (error: unknown) {
      console.error("Error al procesar nómina:", error);
      const errorMessage = getErrorMessage(error, ERROR_MESSAGES.sales.payroll);
      toast.error(errorMessage);
    } finally {
      setProcessingIds((prev) => prev.filter((id) => !saleIds.includes(id)));
      setIdsToProcess([]);
    }
  };

  const toggleSaleSelection = useCallback((saleId: string) => {
    setSelectedSales((prev) =>
      prev.includes(saleId)
        ? prev.filter((id) => id !== saleId)
        : [...prev, saleId],
    );
  }, []);

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

  const isDateInRange = useCallback((date: Date, range: DateRange | null) => {
    if (!range) return true;
    return date >= range.start && date <= range.end;
  }, []);

  // --- Resumen para la sección EMPRENDEDORES ---
  const { fullEntrepreneursSummary, filteredEntrepreneursSummary } =
    useMemo(() => {
      const map: Record<string, EntrepreneurSummary> = {};
      const staticMap: Record<string, EntrepreneurSummary> = {}; // <--- NUEVO: Para nombres siempre visibles

      // 1. Agrupación estática (Para que el nombre no desaparezca nunca)
      // Itera sobre ALL sale_items para capturar TODOS los emprendimientos involucrados
      scopedSales.forEach((s) => {
        s.sale_items.forEach((item) => {
          const entrepreneurship = item.products?.entrepreneurships;
          if (!entrepreneurship) return;

          if (!staticMap[entrepreneurship.id]) {
            staticMap[entrepreneurship.id] = {
              id: entrepreneurship.id,
              name: entrepreneurship.name,
              ownerName: entrepreneurship.users.name,
              totalRevenue: 0,
              pendingPayroll: 0,
              salesCount: 0,
              pendingIds: [],
              sedes: [...(sedesByEntrepreneur[entrepreneurship.id] ?? [])],
            };
          }
        });
      });

      // 2. Filtrado base por FECHA, CICLO, ESTADO y TIPO DE PAGO
      const currentYear = new Date().getFullYear();
      const baseSales = scopedSales.filter((sale) => {
        const saleDate = new Date(sale.created_at);
        const matchesStatus =
          statusFilter === "all"
            ? true
            : statusFilter === "pending"
              ? (sale.payment_type !== "immediate" && !sale.payroll_processed && !sale.refunded) ||
                (sale.payment_type === "immediate" && !sale.sale_items.every((item) => item.entrepreneur_processed || item.refunded) && !sale.refunded)
              : statusFilter === "paid"
                ? sale.payment_type === "immediate" && sale.sale_items.every((item) => item.entrepreneur_processed || item.refunded) && !sale.refunded
                : statusFilter === "refunded"
                  ? sale.refunded === true || sale.sale_items.every((item) => item.refunded)
                  : sale.payment_type !== "immediate" && sale.payroll_processed;
        const matchesPaymentType =
          paymentMethodFilter === "all"
            ? true
            : paymentMethodFilter === "credit"
              ? sale.payment_type !== "immediate"
              : sale.payment_type === "immediate" && sale.payment_method === paymentMethodFilter;
        const matchesMonth =
          selectedMonth === null
            ? true
            : saleDate.getMonth() === selectedMonth &&
              saleDate.getFullYear() === currentYear;
        const matchesDateRange = isDateInRange(saleDate, dateRange);
        return matchesStatus && matchesPaymentType && matchesMonth && matchesDateRange;
      });

      // 3. Agrupación por Emprendimiento para resultados filtrados
      // Itera sobre ALL sale_items para distribuir subtotales a cada emprendimiento
      baseSales.forEach((s) => {
        const venturesInSale = new Set<string>();
        const isCredit = s.payment_type !== "immediate";

        s.sale_items.forEach((item) => {
          const entrepreneurship = item.products?.entrepreneurships;
          if (!entrepreneurship) return;

          const entId = entrepreneurship.id;
          venturesInSale.add(entId);

          if (!map[entId]) {
            map[entId] = {
              ...staticMap[entId],
              pendingIds: [],
              sedes: [...staticMap[entId].sedes],
            };
          }

          const subtotal = Number(item.subtotal) || 0;
          map[entId].totalRevenue += subtotal;
          // Only credit sales contribute to pending payroll
          if (isCredit && !s.payroll_processed && !s.refunded) {
            map[entId].pendingPayroll += subtotal;
          }
        });

        venturesInSale.forEach((entId) => {
          map[entId].salesCount += 1;
          if (isCredit && !s.payroll_processed && !s.refunded) {
            map[entId].pendingIds.push(s.id);
          }
        });
      });

      const fullList = Object.values(map);
      const searchLower = searchQuery.toLowerCase();

      const filteredList = fullList
        .filter(
          (ent) =>
            !searchQuery ||
            ent.name.toLowerCase().includes(searchLower) ||
            ent.ownerName.toLowerCase().includes(searchLower),
        )
        .toSorted((a, b) => a.name.localeCompare(b.name));

      return {
        fullEntrepreneursSummary: Object.values(staticMap),
        filteredEntrepreneursSummary: filteredList,
      };
    }, [
      scopedSales,
      sedesByEntrepreneur,
      searchQuery,
      statusFilter,
      paymentMethodFilter,
      dateRange,
      isDateInRange,
      selectedMonth,
    ]);

  // --- Resumen para la sección CONSUMIDORES (Empleados) ---
  const { fullConsumersSummary, consumersSummary } = useMemo(() => {
    const map: Record<string, ConsumerSummary> = {};
    const staticMap: Record<string, ConsumerSummary> = {}; // <--- Mapa de referencia persistente

    // 1. Agrupación estática (Para que el nombre del consumidor nunca sea undefined)
    // Usamos el alcance de la sede activa y las sedes se calculan desde el conjunto completo
    scopedSales.forEach((s) => {
      const user = s.users;
      if (!user) return;

      if (!staticMap[user.email]) {
        staticMap[user.email] = {
          id: user.id,
          name: user.name,
          email: user.email,
          totalSpent: 0,
          pendingDeduction: 0,
          ordersCount: 0,
          pendingIds: [],
          sedes: [...(sedesByConsumer[user.email] ?? [])],
        };
      }
    });

    // 2. Filtramos ventas por rango de fechas y mes
    const currentYear = new Date().getFullYear();
    const cycleSales = scopedSales.filter((s) => {
      const saleDate = new Date(s.created_at);
      const matchesMonth =
        selectedMonth === null
          ? true
          : saleDate.getMonth() === selectedMonth &&
            saleDate.getFullYear() === currentYear;
      const matchesDateRange = isDateInRange(saleDate, dateRange);
      return matchesMonth && matchesDateRange;
    });

    // 3. Agrupamos los datos reales del ciclo en el mapa que se mostrará
    cycleSales.forEach((s) => {
      const user = s.users;
      if (!user) return;

      if (!map[user.email]) {
        // Inicializamos con los datos base del staticMap para asegurar consistencia
        map[user.email] = {
          ...staticMap[user.email],
          pendingIds: [],
          sedes: [...staticMap[user.email].sedes],
        };
      }

      map[user.email].totalSpent += s.total;
      map[user.email].ordersCount += 1;

      // Only credit sales contribute to pending deduction
      if (s.payment_type !== "immediate" && !s.payroll_processed && !s.refunded) {
        map[user.email].pendingDeduction += s.total;
        map[user.email].pendingIds.push(s.id);
      }
    });

    // Esta lista se usa para la tabla (afectada por filtros de ciclo/mes)
    const fullListForCycle = Object.values(map);
    const searchLower = searchQuery.toLowerCase();

    // 4. Aplicamos el filtro de búsqueda para la vista de tabla
    const filteredList = fullListForCycle
      .filter((consumer) => {
        if (!searchQuery) return true;
        return (
          consumer.name.toLowerCase().includes(searchLower) ||
          consumer.email.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      fullConsumersSummary: Object.values(staticMap),
      consumersSummary: filteredList,
    };
  }, [
    scopedSales,
    sedesByConsumer,
    searchQuery,
    dateRange,
    isDateInRange,
    selectedMonth,
  ]);

  const filteredSales = useMemo(() => {
    return scopedSales.filter((sale) => {
      const searchLower = searchQuery.toLowerCase();
      const saleDate = new Date(sale.created_at);

      // 1. Filtro por Texto
      const userName = sale.users?.name?.toLowerCase() || "";

      const matchesEntrepreneur = sale.sale_items.some((item) =>
        item.products?.entrepreneurships?.name?.toLowerCase().includes(searchLower),
      );

      const matchesProduct = sale.sale_items.some((item) =>
        item.products?.name?.toLowerCase().includes(searchLower),
      );

      const matchesSearch =
        matchesEntrepreneur ||
        userName.includes(searchLower) ||
        matchesProduct;

      // 2. Filtro por Estado de Nómina (excluye pagos inmediatos)
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "pending"
            ? (sale.payment_type !== "immediate" && !sale.payroll_processed && !sale.refunded) ||
              (sale.payment_type === "immediate" && !sale.sale_items.every((item) => item.entrepreneur_processed || item.refunded) && !sale.refunded)
            : statusFilter === "paid"
              ? sale.payment_type === "immediate" && sale.sale_items.every((item) => item.entrepreneur_processed || item.refunded) && !sale.refunded
              : statusFilter === "refunded"
                ? sale.refunded === true || sale.sale_items.every((item) => item.refunded)
                : sale.payment_type !== "immediate" && sale.payroll_processed;

      const matchesPaymentType =
        paymentMethodFilter === "all"
          ? true
          : paymentMethodFilter === "credit"
            ? sale.payment_type !== "immediate"
            : sale.payment_type === "immediate" && sale.payment_method === paymentMethodFilter;

      const matchesMonth =
        selectedMonth === null
          ? true
          : saleDate.getMonth() === selectedMonth &&
            saleDate.getFullYear() === new Date().getFullYear();
      const matchesDateRange = isDateInRange(saleDate, dateRange);

      return matchesSearch && matchesStatus && matchesPaymentType && matchesMonth && matchesDateRange;
    });
  }, [
    scopedSales,
    searchQuery,
    statusFilter,
    paymentMethodFilter,
    dateRange,
    isDateInRange,
    selectedMonth,
  ]);

  return {
    sales: filteredSales,
    hasLocationData,
    clearSelection,
    selectedSales,
    setSelectedSales,
    toggleSaleSelection,
    fullEntrepreneursSummary,
    entrepreneursSummary: filteredEntrepreneursSummary,
    fullConsumersSummary,
    consumersSummary,
    loading,
    processingIds,
    setProcessingIds,
    processPayroll,
    openProcessPayroll,
    markItemsRefunded,
    refetch: fetchData,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    dateRange,
    setDateRange,
    setSelectedMonth,
    selectedMonth,
    sortOrder,
    setSortOrder,
    modalProps: {
      isOpen: isModalOpen,
      onClose: () => !processingIds.length && setIsModalOpen(false),
      onConfirm: () => processPayroll(idsToProcess),
      title: modalConfig.title,
      message: modalConfig.message,
      isLoading: processingIds.length > 0,
      confirmText: "Si, liquidar",
    },
  };
}
