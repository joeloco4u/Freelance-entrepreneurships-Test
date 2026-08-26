import { useEffect, useMemo, useState } from "react";
import type { CatalogProduct, EntrepreneurPaymentData, PaymentMethod } from "../types";
import { getPaymentDataByProducts } from "../services/paymentDataService";
import { getErrorMessage } from "../utils/errorMessage";
import { ERROR_MESSAGES } from "../constants/errorMessages";

interface UsePaymentDataCheckoutProps {
  cartEntries: { product: CatalogProduct; qty: number }[];
  paymentMethod: PaymentMethod;
  paymentType: "credit" | "immediate";
}

export function usePaymentDataCheckout({
  cartEntries,
  paymentMethod,
  paymentType,
}: UsePaymentDataCheckoutProps) {
  const [paymentData, setPaymentData] = useState<EntrepreneurPaymentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable string key from cart product IDs — strings compare by value so the
  // effect below won't re-fire when cartEntries gets a new reference but the
  // actual IDs haven't changed (which happens on every render in useCart).
  const productIdsKey = useMemo(() => {
    const ids = new Set<string>();
    for (const { product } of cartEntries) ids.add(String(product.id));
    return Array.from(ids).sort().join(",");
  }, [cartEntries]);

  // Determine if we should fetch payment data
  const shouldFetch =
    paymentType === "immediate" &&
    !!paymentMethod &&
    paymentMethod !== "efectivo" &&
    productIdsKey.length > 0;

  // Fetch payment data when conditions are met
  useEffect(() => {
    if (!shouldFetch) return;

    const productIds = productIdsKey.split(",");
    let cancelled = false;

    const fetchData = async () => {
      setPaymentData([]);
      setLoading(true);
      setError(null);
      try {
        const data = await getPaymentDataByProducts(productIds);
        if (cancelled) return;
        const filtered = data.filter((d) => d.payment_method === paymentMethod);
        setPaymentData(filtered);
      } catch (err) {
        if (cancelled) return;
        console.error("Error fetching payment data:", err);
        setError(getErrorMessage(err, ERROR_MESSAGES.paymentData.load));
        setPaymentData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [shouldFetch, paymentMethod, productIdsKey]);

  // Derive display data: empty when conditions aren't met, fetched data otherwise
  const paymentDisplayData = useMemo(() => {
    if (!shouldFetch) return [];
    return paymentData;
  }, [shouldFetch, paymentData]);

  // Only show loading indicator when we're actually fetching
  const displayLoading = shouldFetch && loading;

  return { paymentDisplayData, loading: displayLoading, error };
}
