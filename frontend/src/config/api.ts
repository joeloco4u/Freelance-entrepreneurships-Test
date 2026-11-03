import axios from "axios";
import { type ApiErrorResponse, AppError } from "../types";
import { resolveApiBaseUrl } from "./apiBase";
import { supabase } from "./supabaseClient"; // Importamos tu cliente existente
import { looksInternal } from "../utils/errorMessage";
import {
  GENERIC_ERROR,
  NETWORK_ERROR,
  STATUS_MESSAGES,
} from "../constants/errorMessages";

const api = axios.create({
  baseURL: resolveApiBaseUrl(import.meta.env.VITE_API_URL),
  headers: {
    "Content-Type": "application/json",
  },
});

// 1. INTERCEPTOR DE SOLICITUD: Inyectar el Token
api.interceptors.request.use(
  async (config) => {
    // Obtenemos la sesión actual de forma asíncrona
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// 2. INTERCEPTOR DE RESPUESTA: Manejo de errores (Tu código original)
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    let customMessage = "Error inesperado";
    let status: number | undefined;

    if (axios.isAxiosError(error)) {
      // Tipamos la respuesta del servidor
      const serverData = error.response?.data as ApiErrorResponse | undefined;
      status = error.response?.status;

      if (!error.response) {
        // Sin respuesta: el servidor no respondió o no hay conexión
        customMessage = NETWORK_ERROR;
      } else {
        customMessage =
          serverData?.error ??
          serverData?.message ??
          error.message ??
          customMessage;
      }
    }

    // Defensa en profundidad: nunca mostramos detalles internos al usuario,
    // aunque un endpoint los devuelva por error. El detalle real queda en consola.
    if (looksInternal(customMessage)) {
      console.error("[api] Respuesta con detalle interno:", customMessage);
      customMessage =
        (status !== undefined ? STATUS_MESSAGES[status] : undefined) ??
        GENERIC_ERROR;
    }

    // Retornamos nuestra clase personalizada en lugar de any
    return Promise.reject(new AppError(customMessage, status));
  },
);

export default api;
