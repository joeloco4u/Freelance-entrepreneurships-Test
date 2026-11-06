import { Search, X } from "lucide-react";
import type React from "react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
  onKeyDown,
}: SearchInputProps) {
  return (
    <div className="relative flex-1 group w-full">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors"
        size={18}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-xs md:text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-md hover:bg-gray-200 transition-all cursor-pointer"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
