import type { AdminSedeFilter } from "../../../config/locations";
import type { EntrepreneurSummary } from "../../../types";
import { SedeColumnFilter } from "../../shared/SedeColumnFilter";
import { SummaryDesktop } from "./SummaryDesktop";
import { SummaryEmptyState } from "./SummaryEmptyState";
import { SummaryMobile } from "./SummaryMobile";

interface Props {
  data: EntrepreneurSummary[];
  onSelect: (id: string) => void;
  searchQuery: string;
  sedeFilter: AdminSedeFilter;
  onSedeFilterChange: (value: AdminSedeFilter) => void;
  hasLocationData: boolean;
}

export const SummaryView = ({
  data,
  onSelect,
  searchQuery,
  sedeFilter,
  onSedeFilterChange,
  hasLocationData,
}: Props) => {
  if (data.length === 0) {
    return (
      <div className="space-y-4">
        {hasLocationData && (
          <div className="px-6 pt-4">
            <SedeColumnFilter
              value={sedeFilter}
              onChange={onSedeFilterChange}
            />
          </div>
        )}
        <SummaryEmptyState query={searchQuery} sedeFilter={sedeFilter} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:bg-white md:rounded-3xl md:border md:border-gray-100 md:shadow-sm overflow-hidden">
      <SummaryDesktop
        data={data}
        onSelect={onSelect}
        sedeFilter={sedeFilter}
        onSedeFilterChange={onSedeFilterChange}
        hasLocationData={hasLocationData}
      />
      <SummaryMobile data={data} onSelect={onSelect} />
    </div>
  );
};
