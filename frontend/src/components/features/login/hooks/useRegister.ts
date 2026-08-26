import { useState } from "react";
import { requestAccess } from "../../../../services/authService";
import type { RegisterForm, UserRole } from "../../../../types";
import { getErrorMessage } from "../../../../utils/errorMessage";

export function useRegister() {
  const [form, setForm] = useState<RegisterForm>({
    user_name: "",
    email: "",
    entrepreneurship_name: "",
    role: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const updateField =
    (key: keyof RegisterForm) => (value: string | UserRole[]) => {
      setError(null);
      setForm((f) => ({ ...f, [key]: value }));
    };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.role.length === 0) {
      setError("Debes seleccionar al menos un rol.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await requestAccess(form);
      setSuccess(true);
    } catch (err: unknown) {
      setError(
        getErrorMessage(err, "No se pudo enviar la solicitud. Verifica tu conexión e intenta de nuevo."),
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    loading,
    error,
    success,
    updateField,
    handleRegister,
  };
}
