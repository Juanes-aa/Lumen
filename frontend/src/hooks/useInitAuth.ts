import { useEffect, useState } from "react";
import { refreshToken } from "../api/auth";
import { useAuthStore } from "../stores/authStore";

interface StoredUser {
  user_id: string;
  email: string;
  username: string;
}

const USER_KEY: string = "lumen_user";

function readStoredUser(): StoredUser | null {
  // Intentar localStorage primero (nuevo), luego sessionStorage (legado)
  const sources = [
    () => localStorage.getItem(USER_KEY),
    () => localStorage.getItem("ct_user"),
    () => sessionStorage.getItem("ct_user"),
  ];
  for (const read of sources) {
    const raw = read();
    if (raw !== null) {
      try {
        return JSON.parse(raw) as StoredUser;
      } catch {
        // ignorar entradas corruptas
      }
    }
  }
  return null;
}

export function useInitAuth(): { isReady: boolean } {
  const [isReady, setIsReady] = useState<boolean>(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    refreshToken()
      .then((response) => {
        // El refresh devuelve datos del usuario: sesión completamente restaurable
        setAuth(
          {
            user_id: response.user_id,
            email: response.email,
            username: response.username,
          },
          response.access_token,
        );
      })
      .catch(() => {
        // Refresh falló (cookie expirada, cross-origin bloqueado, sin red…)
        const storedUser = readStoredUser();
        if (storedUser === null) {
          clearAuth();
        } else {
          // Restaurar sesión con los datos locales para que isAuthenticated=true
          // y el usuario no sea redirigido al login. El access_token quedará
          // vacío hasta que el próximo request lo refresque.
          setAuth(storedUser, "");
        }
      })
      .finally(() => {
        setIsReady(true);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { isReady };
}
