import { create } from "zustand";

interface AuthUser {
  user_id: string;
  email: string;
  username: string;
}

interface AuthState {
  user: AuthUser | null;
  access_token: string | null;
  isAuthenticated: boolean;
  // El refresh_token ya NO se maneja en JS: vive en una cookie HttpOnly
  // (Path=/auth) que el navegador adjunta automáticamente a /auth/refresh
  // y /auth/logout.
  setAuth: (user: AuthUser, access_token: string) => void;
  clearAuth: () => void;
}

const USER_KEY: string = "ct_user";

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  access_token: null,
  isAuthenticated: false,

  setAuth: (user: AuthUser, access_token: string) => {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user, access_token, isAuthenticated: true });
  },

  clearAuth: () => {
    sessionStorage.removeItem(USER_KEY);
    // Limpieza defensiva del esquema antiguo (refresh_token en localStorage).
    localStorage.removeItem("ct_refresh_token");
    localStorage.removeItem("ct_user");
    set({ user: null, access_token: null, isAuthenticated: false });
  },
}));
