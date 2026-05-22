import type {
  RegisterRequest,
  RegisterPendingResponse,
  AuthResponse,
  LoginRequest,
  RefreshResponse,
} from "../types/auth";
import { apiFetch } from "./client";

export async function registerUser(data: RegisterRequest): Promise<RegisterPendingResponse> {
  return apiFetch<RegisterPendingResponse>("/auth/register", { method: "POST", body: data });
}

export async function loginUser(data: LoginRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", { method: "POST", body: data });
}

/**
 * El refresh_token vive en una cookie HttpOnly (Path=/auth). El navegador
 * la adjunta automáticamente; este cliente no lee ni envía el token.
 */
export async function refreshToken(): Promise<RefreshResponse> {
  return apiFetch<RefreshResponse>("/auth/refresh", { method: "POST" });
}

export async function logoutUser(): Promise<void> {
  await apiFetch<void>("/auth/logout", { method: "POST" });
}

export async function resendVerification(email: string): Promise<void> {
  await apiFetch<{ message: string }>("/auth/resend-verification", {
    method: "POST",
    body: { email },
  });
}

export async function forgotPassword(email: string): Promise<void> {
  await apiFetch<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export async function resetPassword(
  newPassword: string,
  accessToken: string,
): Promise<void> {
  await apiFetch<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: { new_password: newPassword },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
