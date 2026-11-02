import type { AdminSedeFilter } from "../../../config/locations";
import type { GlobalSale } from "../../../types";
import { SedeColumnFilter } from "../../shared/SedeColumnFilter";
import { DetailedDesktop } from "./DetailedDesktop";
import { DetailedMobile } from "./DetailedMobile";
import { SummaryEmptyState } from "./SummaryEmptyState";

interface Props {
  sales: GlobalSale[];
  selectedSales: string[];
  toggleSelection: (id: string) => void;
  toggleAll: () => void;
  onProcessSingle: (id: string) => void;
  onRefund: (sale: GlobalSale) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (order: "asc" | "desc") => void;
  processingIds: string[];
  searchQuery: string;
  selectedEntId?: string | null;
  sedeFilter: AdminSedeFilter;
  onSedeFilterChange: (value: AdminSedeFilter) => void;
  hasLocationData: boolean;
}

export const DetailedView = (props: Props) => {
  const {
    sales,
    searchQuery,
    sedeFilter,
    onSedeFilterChange,
    hasLocationData,
  } = props;

  if (sales.length === 0) {
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
    <div className="space-y-4 md:bg-white md:rounded-3xl md:border md:border-gray-100 md:shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
      <DetailedDesktop {...props} />
      <DetailedMobile
        sales={props.sales}
        selectedSales={props.selectedSales}
        toggleSelection={props.toggleSelection}
        onProcessSingle={props.onProcessSingle}
        onRefund={props.onRefund}
        processingIds={props.processingIds}
        selectedEntId={props.selectedEntId}
      />
    </div>
  );
};
