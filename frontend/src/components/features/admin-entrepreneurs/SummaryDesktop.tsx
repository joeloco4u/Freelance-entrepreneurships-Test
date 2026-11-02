import { Store } from "lucide-react";
import type { AdminSedeFilter } from "../../../config/locations";
import { SedeBadge } from "../../shared/SedeBadge";
import { SedeColumnFilter } from "../../shared/SedeColumnFilter";
import type { EntrepreneurSummary } from "../../../types";
import { formatCurrency } from "../../../utils/format";

interface Props {
  data: EntrepreneurSummary[];
  onSelect: (id: string) => void;
  sedeFilter: AdminSedeFilter;
  onSedeFilterChange: (value: AdminSedeFilter) => void;
  hasLocationData: boolean;
}

export const SummaryDesktop = ({
  data,
  onSelect,
  sedeFilter,
  onSedeFilterChange,
  hasLocationData,
}: Props) => (
  <div className="hidden md:block overflow-x-auto">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-100">
          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">
            Negocio
          </th>
          {hasLocationData && (
            <th scope="col" className="px-6 py-4">
              <SedeColumnFilter
                value={sedeFilter}
                onChange={onSedeFilterChange}
              />
            </th>
          )}
          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase text-right">
            Pedidos
          </th>
          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase text-right">
            Pendiente
          </th>
          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase text-right">
            Total Acumulado
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {data.map((ent) => (
          <tr
            key={ent.id}
            onClick={() => onSelect(ent.id)}
            className="hover:bg-gray-50/50 cursor-pointer transition-colors"
          >
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                  <Store size={16} />
                </div>
                <span className="font-bold text-gray-900">
                  {ent.name} - {ent.ownerName}
                </span>
              </div>
            </td>
            {hasLocationData && (
              <td className="px-6 py-4">
                <SedeBadge codes={ent.sedes} />
              </td>
            )}
            <td className="px-6 py-4 text-right text-sm text-gray-500">
              {ent.salesCount}
            </td>
            <td className="px-6 py-4 text-right font-medium text-amber-600">
              {formatCurrency(ent.pendingPayroll)}
            </td>
            <td className="px-6 py-4 text-right font-bold text-gray-900">
              {formatCurrency(ent.totalRevenue)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
