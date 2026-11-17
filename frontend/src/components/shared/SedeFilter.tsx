import { MapPin } from "lucide-react";
import {
  SEDE_FILTER_OPTIONS,
  isAdminSedeFilter,
  type AdminSedeFilter,
} from "../../config/locations";
import FilterSelector from "./FilterSelector";

interface Props {
  value: AdminSedeFilter;
  onChange: (value: AdminSedeFilter) => void;
}

export function SedeFilter({ value, onChange }: Props) {
  const label =
    SEDE_FILTER_OPTIONS.find((option) => option.value === value)?.label ??
    "Todas";

  return (
    <FilterSelector
      label={`Sede: ${label}`}
      icon={MapPin}
      onChange={(key) => {
        if (isAdminSedeFilter(key)) onChange(key);
      }}
      items={SEDE_FILTER_OPTIONS.map((option) => ({
        key: option.value,
        label: option.label,
      }))}
    />
  );
}
