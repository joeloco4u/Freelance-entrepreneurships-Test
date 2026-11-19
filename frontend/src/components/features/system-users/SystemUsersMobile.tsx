import { Trash2 } from "lucide-react";
import type { PublicUser } from "../../../types";
import DepartmentBadge from "./shared/DepartmentBadge";
import RoleBadge from "./shared/RoleBadge";

interface Props {
  users: PublicUser[];
  isLoading: boolean;
  onEdit: (user: PublicUser) => void;
  onDelete: (id: string) => void;
}

export default function SystemUsersMobile({
  users,
  isLoading,
  onEdit,
  onDelete,
}: Props) {
  const skeletonRows = ["sk-m1", "sk-m2", "sk-m3"];

  if (isLoading) {
    return (
      <div className="md:hidden grid grid-cols-1 gap-10 px-4 pt-6">
        {skeletonRows.map((id) => (
          <div
            key={id}
            className="h-56 bg-gray-100 animate-pulse rounded-[2.5rem]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="md:hidden grid grid-cols-1 gap-10 px-4 pt-6">
      {users.map((user) => {
        const isActive = user.is_active !== false;
        return (
        <div key={user.id} className="relative group">
          {/* BOTÓN ELIMINAR FLOTANTE */}
          {isActive && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(user.id);
              }}
              className="absolute -top-4 -right-2 z-30 w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-red-200 active:scale-90 transition-transform border-[6px] border-white cursor-pointer"
            >
              <Trash2 size={20} />
            </button>
          )}

          {/* CARD PRINCIPAL - Actúa como botón de edición */}
          <button
            type="button"
            onClick={() => onEdit(user)}
            className={`bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col gap-6 active:bg-gray-50 active:scale-[0.97] transition-all text-left w-full cursor-pointer ${isActive ? "" : "opacity-60"}`}
          >
            {/* AVATAR E INFO BÁSICA */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold border-4 border-white shadow-md shrink-0">
                {user.name.charAt(0)}
              </div>

              <div className="min-w-0 w-full">
                <h3 className="text-xl font-extrabold text-gray-900 wrap-break-word leading-tight mb-1">
                  {user.name}
                </h3>
                <p className="text-sm text-gray-400 break-all leading-tight opacity-80">
                  {user.email}
                </p>
                  <span
                    className={`inline-block mt-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${isActive ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}
                  >
                    {isActive ? "Activo" : "Inactivo"}
                  </span>
              </div>
            </div>

            {/* DETALLES: DEPARTAMENTO Y ROLES */}
            <div className="space-y-6 pt-4 border-t border-gray-50">
              <div className="flex flex-col gap-2">
                <span className="text-[11px] uppercase font-black text-gray-400 tracking-[0.15em] opacity-70">
                  Departamento
                </span>
                <div className="flex items-center">
                  <DepartmentBadge dept={user.departamento} />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-[11px] uppercase font-black text-gray-400 tracking-[0.15em] opacity-70">
                  Roles Asignados
                </span>
                <div className="flex flex-wrap gap-2">
                  {user.roles?.map((roleId) => (
                    <RoleBadge key={roleId} roleId={roleId} />
                  ))}
                </div>
              </div>
            </div>
          </button>
        </div>
        );
      })}
    </div>
  );
}
