import { useState } from "react";
import { requestPasswordRecovery } from "../services/authService";
import { getErrorMessage } from "../utils/errorMessage";

export function useForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // The backend mints the recovery link and sends it through Resend, so this
      // no longer depends on Supabase's built-in mailer.
      await requestPasswordRecovery(email);
      setSuccess(true);
    } catch (err) {
      setError(
        getErrorMessage(err, "No se pudo enviar el correo de recuperación. Verifica tu conexión e intenta de nuevo."),
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    loading,
    error,
    success,
    handleSubmit,
  };
}
