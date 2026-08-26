import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  createEntrepreneurship,
  deleteEntrepreneurship,
  getMyEntrepreneurships,
  updateEntrepreneurship,
} from "../services/entrepreneurshipService";
import type { Entrepreneurship } from "../types";
import { getErrorMessage } from "../utils/errorMessage";
import { ERROR_MESSAGES } from "../constants/errorMessages";

export function useEntrepreneurships() {
  const [items, setItems] = useState<Entrepreneurship[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string | null;
    name: string;
  }>({
    isOpen: false,
    id: null,
    name: "",
  });

  // Estado para el modal de formulario (Crear/Editar)
  const [formModal, setFormModal] = useState<{
    isOpen: boolean;
    biz: Entrepreneurship | null;
  }>({
    isOpen: false,
    biz: null,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getMyEntrepreneurships();
      setItems(data);
    } catch (error) {
      const errorMessage = getErrorMessage(error, ERROR_MESSAGES.entrepreneurships.load);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    getMyEntrepreneurships()
      .then((data) => {
        if (cancelled) return;
        setItems(data);
      })
      .catch((error) => {
        if (cancelled) return;
        const errorMessage = getErrorMessage(error, ERROR_MESSAGES.entrepreneurships.load);
        toast.error(errorMessage);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const openDeleteModal = (id: string, name: string) => {
    setDeleteModal({ isOpen: true, id, name });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, id: null, name: "" });
  };

  const openFormModal = (biz: Entrepreneurship | null = null) =>
    setFormModal({ isOpen: true, biz });
  const closeFormModal = () => setFormModal({ isOpen: false, biz: null });

  const confirmDelete = async () => {
    if (!deleteModal.id) return;

    try {
      setIsDeleting(true);
      await deleteEntrepreneurship(deleteModal.id);
      toast.success(`${deleteModal.name} eliminado con exito.`);
      await fetchData(); // Refrescar lista
      closeDeleteModal();
    } catch (error) {
      const errorMessage = getErrorMessage(error, ERROR_MESSAGES.entrepreneurships.delete);
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const saveEntrepreneurship = async (
    id: string | undefined,
    data: { name: string },
  ) => {
    setIsSaving(true);
    try {
      if (id) {
        // MODO EDICIÓN
        const updated = await updateEntrepreneurship(id, data);
        setItems((prev) =>
          prev.map((item) => (item.id === id ? updated : item)),
        );
        toast.success("Emprendimiento actualizado con éxito");
        await fetchData();
      } else {
        // MODO CREACIÓN
        const created = await createEntrepreneurship(data);
        setItems((prev) => [created, ...prev]);
        toast.success("Emprendimiento creado con éxito");
        await fetchData();
      }
      closeFormModal();
    } catch (error) {
      console.error(error);
      const errorMessage = getErrorMessage(error, ERROR_MESSAGES.entrepreneurships.save);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    items,
    loading,
    isDeleting,
    deleteModal,
    formModal,
    openDeleteModal,
    closeDeleteModal,
    confirmDelete,
    openFormModal,
    closeFormModal,
    isSaving,
    saveEntrepreneurship,
    fetchData,
  };
}
