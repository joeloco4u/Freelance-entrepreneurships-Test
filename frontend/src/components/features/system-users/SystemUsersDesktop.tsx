import type { PublicUser } from "../../../types";
import SystemUsersSkeleton from "./SystemUsersSkeleton";
import ActionButtons from "./shared/ActionButtons";
import DepartmentBadge from "./shared/DepartmentBadge";
import RoleBadge from "./shared/RoleBadge";

interface Props {
  users: PublicUser[];
  isLoading: boolean;
  onEdit: (user: PublicUser) => void;
  onDelete: (id: string) => void;
}

export default function SystemUsersDesktop({
  users,
  isLoading,
  onEdit,
  onDelete,
}: Props) {
  const skeletonRows = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"];

  return (
    <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-100">
            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Usuario
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Departamento
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Roles
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {isLoading
            ? skeletonRows.map((id) => <SystemUsersSkeleton key={id} />)
            : users.map((user) => {
                const isActive = user.is_active !== false;
                return (
                <tr
                  key={user.id}
                  className={`hover:bg-gray-50/50 transition-all group ${!isActive ? "opacity-60 bg-gray-50/40" : ""}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <DepartmentBadge dept={user.departamento} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {user.roles?.map((r) => (
                        <RoleBadge key={r} roleId={r} />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${isActive ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}
                    >
                      {isActive ? "ACTIVO" : "INACTIVO"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ActionButtons
                      onEdit={() => onEdit(user)}
                      onDelete={() => onDelete(user.id)}
                      isActive={isActive}
                    />
                  </td>
                </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}
