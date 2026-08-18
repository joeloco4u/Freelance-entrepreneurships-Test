import api from "../config/api";
import { supabase } from "../config/supabaseClient";
import type {
  LoginFormType,
  LoginResponse,
  RegisterForm,
  SignupRequest,
  SimpleResponse,
} from "../types";

export async function loginUser(
  credentials: LoginFormType,
): Promise<LoginResponse> {
  // Usamos la instancia de axios 'api' que ya tienes configurada
  const { data } = await api.post<LoginResponse>("/auth/login", credentials);
  return data;
}

export async function requestAccess(
  formData: RegisterForm,
): Promise<SimpleResponse> {
  const { data } = await api.post<SimpleResponse>(
    "/auth/request-access",
    formData,
  );
  return data;
}

export async function getPendingRequests(): Promise<SignupRequest[]> {
  const { data } = await api.get<SignupRequest[]>("/auth/pending-requests");
  return data;
}

export async function approveAccessRequest(
  requestId: string,
): Promise<SimpleResponse> {
  const { data } = await api.post<SimpleResponse>(
    `/auth/approve-signup/${requestId}`,
  );
  return data;
}

export async function rejectAccessRequest(id: string): Promise<void> {
  await api.patch(`/auth/reject-signup/${id}`);
}

export async function requestPasswordRecovery(
  email: string,
): Promise<SimpleResponse> {
  const { data } = await api.post<SimpleResponse>("/auth/forgot-password", {
    email,
  });
  return data;
}

export async function updatePassword(password: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) throw error;
  return data;
}
