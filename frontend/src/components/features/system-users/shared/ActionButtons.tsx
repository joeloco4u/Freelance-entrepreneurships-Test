import { Edit2, Trash2 } from "lucide-react";

export default function ActionButtons({
  onEdit,
  onDelete,
  isActive,
}: {
  onEdit: () => void;
  onDelete: () => void;
  isActive?: boolean;
}) {
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="p-2.5 text-gray-400 hover:text-primary hover:bg-white rounded-xl transition-all active:scale-90 shadow-sm md:shadow-none md:cursor-pointer"
      >
        <Edit2 size={20} />
      </button>
      {isActive !== false && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-xl transition-all active:scale-90 shadow-sm md:shadow-none md:cursor-pointer"
        >
          <Trash2 size={20} />
        </button>
      )}
    </>
  );
}
