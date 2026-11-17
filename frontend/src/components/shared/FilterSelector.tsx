import { Dropdown } from "antd";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";

interface FilterSelectorProps {
  label: string;
  icon: LucideIcon;
  items: { key: string | number; label: string }[];
  selectedKey?: string | number;
  onChange: (key: string | number) => void;
  className?: string;
}

const FilterSelector = ({
  label,
  icon: Icon,
  items,
  onChange,
  className,
}: FilterSelectorProps) => (
  <Dropdown
    menu={{ items, onClick: (info) => onChange(info.key) }}
    trigger={["click"]}
  >
    <button
      type="button"
      className={`w-full flex items-center justify-between gap-2 bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 cursor-pointer ${className}`}
    >
      <div className="flex items-center gap-2 truncate">
        <Icon size={16} className="text-primary shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <ChevronDown size={14} className="text-gray-400" />
    </button>
  </Dropdown>
);

export default FilterSelector;
