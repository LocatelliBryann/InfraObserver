import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { onUnauthorized } from "../services/apiClient";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  type AuthUser,
} from "../services/authService";

export type AuthStatus = "loading" | "authenticated" | "anonymous" | "error";

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((current) => {
        if (!active) {
          return;
        }

        setUser(current);
        setStatus(current ? "authenticated" : "anonymous");
      })
      .catch(() => {
        if (active) {
          setStatus("error");
        }
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  // Qualquer 401 da API (sessão expirada) volta para a tela de login.
  useEffect(
    () =>
      onUnauthorized(() => {
        setUser(null);
        setStatus("anonymous");
      }),
    [],
  );

  const login = useCallback(async (email: string, password: string) => {
    const loggedUser = await loginRequest(email, password);

    setUser(loggedUser);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  const retry = useCallback(() => {
    setStatus("loading");
    setAttempt((current) => current + 1);
  }, []);

  const value = useMemo(
    () => ({ status, user, login, logout, retry }),
    [status, user, login, logout, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Retorna null fora do AuthProvider (útil em testes de componentes isolados).
export function useAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}
