import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  createUser, // Asegúrate de haber agregado esta función a tu service
  deleteUser,
  getAllUsers,
  updateUser,
} from "../services/usersService";
import type { PublicUser } from "../types";
import { getErrorMessage } from "../utils/errorMessage";
import { ERROR_MESSAGES } from "../constants/errorMessages";

export function useSystemUsers() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PublicUser | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error("Error al cargar usuarios", error);
      const errorMessage = getErrorMessage(error, ERROR_MESSAGES.users.load);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    getAllUsers()
      .then((data) => {
        if (cancelled) return;
        setUsers(data);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Error al cargar usuarios", error);
        const errorMessage = getErrorMessage(error, ERROR_MESSAGES.users.load);
        toast.error(errorMessage);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase()),
    );
  }, [users, search]);

  // --- Lógica de Eliminación ---
  const openDeleteModal = (id: string) => {
    setUserToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setIsDeleting(true);
      await deleteUser(userToDelete);
      await fetchUsers();
      setIsDeleteModalOpen(false);
      toast.success("Usuario eliminado exitosamente");
    } catch (error) {
      const errorMessage = getErrorMessage(error, ERROR_MESSAGES.users.delete);
      toast.error(errorMessage);
      console.error("Error al eliminar usuario", error);
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

  // --- Lógica de Guardado (Crear o Editar) ---
  const handleSave = async (
    user: PublicUser | null,
    updatedData: Partial<PublicUser>,
  ) => {
    try {
      setLoading(true);

      if (user) {
        // Si existe 'user', estamos editando
        await updateUser(user.id, updatedData);
        toast.success("Usuario actualizado exitosamente");
      } else {
        // Si 'user' es null, estamos creando
        await createUser(updatedData);
        toast.success("Usuario creado exitosamente");
      }

      await fetchUsers(); // Recargar la lista después de la operación
      setIsModalOpen(false);
      setEditingUser(null);
    } catch (error) {
      toast.error(getErrorMessage(error, ERROR_MESSAGES.users.request));
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user: PublicUser) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingUser(null); // Limpiamos el usuario para que el modal sepa que es "Nuevo"
    setIsModalOpen(true);
  };

  return {
    users: filteredUsers,
    loading,
    search,
    setSearch,
    deleteModal: {
      isOpen: isDeleteModalOpen,
      isLoading: isDeleting,
      onClose: () => setIsDeleteModalOpen(false),
      onConfirm: confirmDelete,
      open: openDeleteModal,
    },
    editModal: {
      isOpen: isModalOpen,
      user: editingUser,
      onClose: () => {
        setIsModalOpen(false);
        setEditingUser(null);
      },
      onSave: handleSave, // Esta función ahora maneja ambos casos
      openEdit: openEditModal,
      openCreate: openCreateModal, // Nueva función para el botón del Header
    },
    refresh: fetchUsers,
  };
}
