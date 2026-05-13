import type {
  RegisterRequest,
  AuthResponse,
  LoginRequest,
  RefreshResponse,
} from "../types/auth";
import { apiFetch } from "./client";

export async function registerUser(data: RegisterRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/register", { method: "POST", body: data });
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
