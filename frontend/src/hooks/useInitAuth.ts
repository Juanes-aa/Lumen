import { useEffect, useState } from "react";
import { refreshToken } from "../api/auth";
import { useAuthStore } from "../stores/authStore";

interface StoredUser {
  user_id: string;
  email: string;
  username: string;
}

const USER_KEY: string = "lumen_user";
const REFRESH_INTERVAL_MS = 25 * 60 * 1000; // 25 minutos (token expira en 1h)

function readStoredUser(): StoredUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (raw !== null) {
    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      // ignorar entradas corruptas
    }
  }
  return null;
}

export function useInitAuth(): { isReady: boolean } {
  const [isReady, setIsReady] = useState<boolean>(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    async function doRefresh(): Promise<void> {
      const response = await refreshToken();
      setAuth(
        {
          user_id: response.user_id,
          email: response.email,
          username: response.username,
        },
        response.access_token,
      );
    }

    // Carga inicial: intentar refresh; si falla, intentar restaurar desde localStorage.
    doRefresh()
      .catch(() => {
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

    // Refresco periódico cada 25 min para mantener el access_token activo.
    // Si el refresh falla (cookie expirada, logout en otra pestaña), cierra sesión.
    const intervalId = setInterval(() => {
      doRefresh().catch(() => {
        clearAuth();
      });
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { isReady };
}
