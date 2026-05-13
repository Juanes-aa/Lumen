import { useEffect, useState } from "react";
import { refreshToken } from "../api/auth";
import { useAuthStore } from "../stores/authStore";

interface StoredUser {
  user_id: string;
  email: string;
  username: string;
}

const USER_KEY: string = "ct_user";

export function useInitAuth(): { isReady: boolean } {
  const [isReady, setIsReady] = useState<boolean>(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    const storedUserRaw: string | null = sessionStorage.getItem(USER_KEY);

    let storedUser: StoredUser | null = null;
    if (storedUserRaw !== null) {
      try {
        storedUser = JSON.parse(storedUserRaw) as StoredUser;
      } catch {
        storedUser = null;
      }
    }

    // Siempre intentamos refresh: si la cookie HttpOnly existe, el backend
    // devuelve un access_token nuevo. Si no, falla con 401 y limpiamos.
    refreshToken()
      .then((response) => {
        if (storedUser !== null) {
          setAuth(storedUser, response.access_token);
        } else {
          // Hay sesión válida pero perdimos el user en sessionStorage
          // (p. ej. cerró la pestaña). Sin user no podemos hidratar el
          // store aquí; el siguiente login resolverá.
          clearAuth();
        }
      })
      .catch(() => {
        clearAuth();
      })
      .finally(() => {
        setIsReady(true);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { isReady };
}