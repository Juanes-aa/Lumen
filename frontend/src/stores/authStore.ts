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
  setAuth: (user: AuthUser, access_token: string) => void;
  clearAuth: () => void;
}

const USER_KEY: string = "lumen_user";

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  access_token: null,
  isAuthenticated: false,

  setAuth: (user: AuthUser, access_token: string) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user, access_token, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem(USER_KEY);
    // limpieza de claves antiguas
    sessionStorage.removeItem("ct_user");
    localStorage.removeItem("ct_user");
    localStorage.removeItem("ct_refresh_token");
    set({ user: null, access_token: null, isAuthenticated: false });
  },
}));
