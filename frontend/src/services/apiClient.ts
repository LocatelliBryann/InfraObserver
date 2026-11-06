const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type RequestOptions = RequestInit;

export class ApiError extends Error {
  constructor(public readonly status: number) {
    super(`Erro na requisição: ${status}`);
  }
}

type UnauthorizedListener = () => void;

const unauthorizedListeners = new Set<UnauthorizedListener>();

// Avisado quando a API responde 401 (sessão expirada ou ausente):
// o AuthProvider usa isso para voltar à tela de login.
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);

  return () => {
    unauthorizedListeners.delete(listener);
  };
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    // Envia o cookie de sessão (httpOnly) junto com a requisição.
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      for (const listener of unauthorizedListeners) {
        listener();
      }
    }

    throw new ApiError(response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get<T>(path: string): Promise<T> {
    return request<T>(path, {
      method: "GET",
    });
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },

  put<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>(path, {
      method: "DELETE",
    });
  },
};
