import { useState, useEffect, useRef } from "react";
import type { LocationCode } from "../config/locations";
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
  location: LocationCode;
}

export function useCheckout({
  cartEntries,
  clearCart,
  refreshProducts,
  closeCartDrawer,
  location,
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

  const locationSnapshotRef = useRef<LocationCode | null>(null);

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
    locationSnapshotRef.current = location;
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
    if (cartEntries.length === 0) {
      setError("Tu carrito está vacío. Vuelve a agregar productos.");
      return;
    }

    if (!selectedConsumerId) {
      setError("Por favor selecciona un comprador.");
      return;
    }

    setStatus("loading");
    setError(null);

    const locationId = locationSnapshotRef.current ?? location;

    try {
      // 1. Mapeamos los items del carrito al formato de la API
      const items = cartEntries.map(({ product, qty }) => ({
        product_id: product.id,
        quantity: qty,
      }));

      // 2. Una sola llamada a la API con el nuevo formato
      await createSale({
        consumer_id: selectedConsumerId,
        items: items,
        payment_type: paymentType,
        payment_method: paymentType === "immediate" ? paymentMethod : undefined,
        note: note.trim() || undefined,
        location_id: locationId,
      });

      // 3. Post-compra
      clearCart();
      setStatus("success");
      void refreshProducts(); // best-effort catalog sync; must not gate success
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
