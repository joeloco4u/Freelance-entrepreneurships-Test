import { Select } from "antd";
import {
  SEDE_FILTER_OPTIONS,
  isAdminSedeFilter,
  type AdminSedeFilter,
} from "../../config/locations";

interface Props {
  value: AdminSedeFilter;
  onChange: (value: AdminSedeFilter) => void;
}

export function SedeColumnFilter({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold text-gray-400 uppercase">
        Sede
      </span>
      <Select
        size="small"
        variant="borderless"
        popupMatchSelectWidth={false}
        aria-label="Filtrar por sede"
        options={SEDE_FILTER_OPTIONS}
        value={value}
        onChange={(next) => {
          if (isAdminSedeFilter(next)) onChange(next);
        }}
        className="min-w-20"
      />
    </div>
  );
}
