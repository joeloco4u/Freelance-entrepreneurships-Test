import { Package } from "lucide-react";
import type { AdminSedeFilter } from "../../../config/locations";

export const SummaryEmptyState = ({
  query,
  sedeFilter = "ALL",
}: {
  query: string;
  sedeFilter?: AdminSedeFilter;
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-100 mt-4">
    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
      <Package size={32} className="text-gray-300" />
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-1">Sin resultados</h3>
    <p className="text-sm text-gray-500 max-w-55">
      {query
        ? `No encontramos nada para "${query}"`
        : sedeFilter !== "ALL"
          ? "No hay datos para esta sede."
          : "No hay datos disponibles."}
    </p>
  </div>
);
