import type { SedeBreakdown } from "../types";

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export function formatSedeBreakdown(breakdown: SedeBreakdown): string | null {
  if (breakdown.VF + breakdown.GO + breakdown.unassigned === 0) return null;
  const parts = [
    `VF: ${formatCurrency(breakdown.VF)}`,
    `GO: ${formatCurrency(breakdown.GO)}`,
  ];
  if (breakdown.unassigned > 0) {
    parts.push(`Sin sede: ${formatCurrency(breakdown.unassigned)}`);
  }
  return parts.join(" • ");
}

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("es-VE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};
