import type { ReactNode } from "react";

import { useAuth } from "./AuthContext";
import { LoginPage } from "./LoginPage";

function FullScreenMessage({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-sm text-slate-400">
      {children}
    </main>
  );
}

// Mostra o dashboard só para quem está logado; os outros veem a tela de login.
export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (!auth) {
    throw new Error("AuthGate must be used inside AuthProvider");
  }

  if (auth.status === "loading") {
    return (
      <FullScreenMessage>
        <p role="status">Verificando sessão...</p>
      </FullScreenMessage>
    );
  }

  if (auth.status === "error") {
    return (
      <FullScreenMessage>
        <p role="alert">Não foi possível conectar à API.</p>
        <button
          type="button"
          onClick={auth.retry}
          className="rounded-lg border border-slate-700 px-4 py-2 text-slate-200 hover:border-cyan-500"
        >
          Tentar novamente
        </button>
      </FullScreenMessage>
    );
  }

  if (auth.status === "anonymous") {
    return <LoginPage onLogin={auth.login} />;
  }

  return <>{children}</>;
}
