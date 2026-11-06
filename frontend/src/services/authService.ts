import { ApiError, apiClient } from "./apiClient";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface UserResponse {
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await apiClient.post<UserResponse>("/api/v1/auth/login", {
    email,
    password,
  });

  return response.user;
}

export async function logout(): Promise<void> {
  await apiClient.post<void>("/api/v1/auth/logout");
}

// Usuário da sessão atual, ou null quando não há login.
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await apiClient.get<UserResponse>("/api/v1/auth/me");

    return response.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
}

// Mensagem para a tela de login a partir do erro da API.
export function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "E-mail ou senha incorretos.";
    }

    if (error.status === 429) {
      return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
    }

    if (error.status === 400) {
      return "Informe um e-mail válido e a senha.";
    }
  }

  return "Não foi possível entrar agora. Tente novamente.";
}
