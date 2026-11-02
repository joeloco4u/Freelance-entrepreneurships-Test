import { Mail, User } from "lucide-react";
import type { AdminSedeFilter } from "../../../config/locations";
import { SedeBadge } from "../../shared/SedeBadge";
import { SedeColumnFilter } from "../../shared/SedeColumnFilter";
import type { ConsumerSummary } from "../../../types";
import { formatCurrency } from "../../../utils/format";

interface Props {
  data: ConsumerSummary[];
  onSelect: (email: string) => void;
  sedeFilter: AdminSedeFilter;
  onSedeFilterChange: (value: AdminSedeFilter) => void;
  hasLocationData: boolean;
}

export const ConsumersDesktop = ({
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
          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Empleado
          </th>
          {hasLocationData && (
            <th scope="col" className="px-6 py-4">
              <SedeColumnFilter
                value={sedeFilter}
                onChange={onSedeFilterChange}
              />
            </th>
          )}
          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">
            Pedidos
          </th>
          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">
            Pendiente
          </th>
          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">
            Gasto Total
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {data.map((consumer) => (
          <tr
            key={consumer.email}
            className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
            onClick={() => onSelect(consumer.email)}
          >
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg text-gray-500 group-hover:bg-primary/10 group-hover:text-primary">
                  <User size={16} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{consumer.name}</p>
                  <p className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Mail size={10} /> {consumer.email}
                  </p>
                </div>
              </div>
            </td>
            {hasLocationData && (
              <td className="px-6 py-4">
                <SedeBadge codes={consumer.sedes} />
              </td>
            )}
            <td className="px-6 py-4 text-right text-gray-500 text-sm">
              {consumer.ordersCount} compras
            </td>
            <td className="px-6 py-4 text-right font-medium text-amber-600">
              {formatCurrency(consumer.pendingDeduction)}
            </td>
            <td className="px-6 py-4 text-right font-bold text-gray-900">
              {formatCurrency(consumer.totalSpent)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
