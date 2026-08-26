import { useState, useEffect } from "react";
import { createSale } from "../services/saleService";
import type { CatalogProduct, Consumer } from "../types";
import { getConsumersList } from "../services/usersService";
import { usePaymentDataCheckout } from "./usePaymentDataCheckout";
import { getErrorMessage } from "../utils/errorMessage";
import { ERROR_MESSAGES } from "../constants/errorMessages";

export type ModalStatus = "idle" | "loading" | "success" | "error";

// Actualizamos la interfaz para que sea consistente con CatalogProduct (id como string)
interface UseCheckoutProps {
  cartEntries: { product: CatalogProduct; qty: number }[];
  clearCart: () => void;
  refreshProducts: () => Promise<void>;
  closeCartDrawer: () => void;
}

export function useCheckout({
  cartEntries,
  clearCart,
  refreshProducts,
  closeCartDrawer,
}: UseCheckoutProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [status, setStatus] = useState<ModalStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [loadingCons, setLoadingCons] = useState(false);

  const [selectedConsumerId, setSelectedConsumerId] = useState<
    string | undefined
  >();

  const [paymentType, setPaymentType] = useState<"credit" | "immediate">("credit");
  const [paymentMethod, setPaymentMethod] = useState<
    "efectivo" | "binance" | "pago_movil" | null
  >(null);
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    if (!modalOpen) return;
    const fetchConsumers = async () => {
      try {
        setLoadingCons(true);
        const data = await getConsumersList();
        setConsumers(data as Consumer[]);
      } catch (err: unknown) {
        setError(
          getErrorMessage(err, "No se pudieron cargar los compradores. Verifica tu conexión e intenta de nuevo."),
        );
      } finally {
        setLoadingCons(false);
      }
    };
    fetchConsumers();
  }, [modalOpen]);

  const handleOpenCheckout = () => {
    closeCartDrawer();
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setTimeout(() => {
      setStatus("idle");
      setSelectedConsumerId(undefined);
      setPaymentType("credit");
      setPaymentMethod(null);
      setNote("");
      setError(null);
    }, 300);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedConsumerId) {
      setError("Por favor selecciona un comprador.");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      // 1. Mapeamos asegurándonos de que el ID sea string (UUID)
      // Usamos String() por si acaso CatalogProduct aún lo tiene como number en algún lado
      const items = cartEntries.map(({ product, qty }) => ({
        product_id: String(product.id),
        quantity: qty,
      }));

      // 2. Una sola llamada a la API con el nuevo formato
      await createSale({
        consumer_id: selectedConsumerId,
        items: items,
        payment_type: paymentType,
        payment_method: paymentType === "immediate" ? paymentMethod : undefined,
        note: note.trim() || undefined,
      });

      // 3. Post-compra
      await refreshProducts();
      clearCart();
      setStatus("success");
    } catch (err: unknown) {
      // Capturamos el error del backend (ej: falta de stock)
      setError(
        getErrorMessage(err, ERROR_MESSAGES.sales.checkout),
      );
      setStatus("error");
    }
  };

  const selectedConsumer = consumers.find((c) => c.id === selectedConsumerId);

  const { paymentDisplayData, loading: paymentDataLoading, error: paymentDataError } = usePaymentDataCheckout({
    cartEntries,
    paymentMethod: paymentType === "immediate" ? paymentMethod : null,
    paymentType,
  });

  const selectOptions = consumers.map((c) => ({
    value: c.id,
    label: `${c.name} - ${c.email}`,
  }));

  return {
    modalOpen,
    status,
    error,
    loadingCons,
    consumers: selectOptions,
    selectedConsumer,
    selectedConsumerId,
    paymentType,
    setPaymentType,
    paymentMethod,
    setPaymentMethod,
    note,
    setNote,
    paymentDisplayData,
    paymentDataLoading,
    paymentDataError,
    onConsumerChange: setSelectedConsumerId,
    handleOpenCheckout,
    handleCloseModal,
    handleConfirmPurchase,
  };
}
