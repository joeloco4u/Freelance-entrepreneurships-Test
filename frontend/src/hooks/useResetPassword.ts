import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../config/supabaseClient";
import { updatePassword } from "../services/authService";
import { getErrorMessage } from "../utils/errorMessage";

export function useResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("El enlace de invitación ha expirado o es inválido.");
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword)
      return setError("Las contraseñas no coinciden.");
    if (password.length < 6) return setError("Mínimo 6 caracteres.");

    setLoading(true);
    setError(null);

    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(
        getErrorMessage(err, "No se pudo actualizar la contraseña. Intenta de nuevo más tarde."),
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    loading,
    error,
    success,
    handleSubmit,
  };
}
