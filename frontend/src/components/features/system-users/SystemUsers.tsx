import { useSystemUsers } from "../../../hooks/useSystemUsers";
import ConfirmationModal from "../../shared/ConfirmationModal";
import SearchInput from "../../shared/SearchInput";
import SystemUsersDesktop from "./SystemUsersDesktop";
import SystemUsersEmpty from "./SystemUsersEmpty";
import SystemUsersHeader from "./SystemUsersHeader";
import SystemUsersMobile from "./SystemUsersMobile";
import UserFormModal from "./UserFormModal";

export default function SystemUsers() {
  const { users, loading, search, setSearch, deleteModal, editModal } =
    useSystemUsers();

  const isInitialLoading = loading && users.length === 0;
  const hasNoUsers = !loading && users.length === 0;

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <SystemUsersHeader onCreate={() => editModal.openCreate()} />

      {/* Buscador */}
      <div className="flex flex-col lg:flex-row gap-3 mb-4 items-center bg-white p-4 rounded-4xl md:rounded-2xl border border-gray-100 shadow-sm">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar usuario..."
        />
      </div>

      {/* Vistas Condicionales */}
      {hasNoUsers ? (
        <SystemUsersEmpty />
      ) : (
        <>
          <SystemUsersDesktop
            users={users}
            isLoading={isInitialLoading}
            onEdit={editModal.openEdit}
            onDelete={deleteModal.open}
          />
          <SystemUsersMobile
            users={users}
            isLoading={isInitialLoading}
            onEdit={editModal.openEdit}
            onDelete={deleteModal.open}
          />
        </>
      )}

      {/* Modales */}
      {editModal.isOpen && (
        <UserFormModal
          key={editModal.user?.id || "new"}
          isOpen={editModal.isOpen}
          onClose={editModal.onClose}
          onSave={editModal.onSave}
          user={editModal.user}
          isLoading={loading}
        />
      )}

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        isLoading={deleteModal.isLoading}
        onClose={deleteModal.onClose}
        onConfirm={deleteModal.onConfirm}
        title="Desactivar Usuario"
        message="¿Estás seguro de que deseas desactivar este usuario? No podrá iniciar sesión ni aparecerá en las listas públicas."
        confirmText="Desactivar"
        type="danger"
      />
    </div>
  );
}
