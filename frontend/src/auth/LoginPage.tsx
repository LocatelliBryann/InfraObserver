import { useState, type FormEvent } from "react";

import { Eye, EyeOff, LockKeyhole } from "lucide-react";

import { BrandMark } from "../components/BrandMark";
import { loginErrorMessage } from "../services/authService";

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError("Informe o e-mail e a senha.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onLogin(email.trim(), password);
    } catch (loginError) {
      setError(loginErrorMessage(loginError));
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size={48} className="mb-4 text-slate-100" />

          <h1 className="text-2xl font-bold tracking-tight">InfraObserver</h1>

          <p className="mt-1 text-sm text-slate-400">
            Acesso restrito ao administrador
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          aria-label="Entrar no InfraObserver"
          className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <div>
            <label
              htmlFor="login-email"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              E-mail
            </label>

            <input
              id="login-email"
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={submitting}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-500 disabled:opacity-60"
              placeholder="admin@empresa.com.br"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Senha
            </label>

            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={submitting}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-3 pr-11 text-sm text-slate-100 outline-none transition-colors focus:border-cyan-500 disabled:opacity-60"
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-slate-500 hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-wait disabled:opacity-70"
          >
            <LockKeyhole size={16} aria-hidden="true" />
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          Sessão protegida por cookie seguro. Após 5 tentativas erradas, o acesso
          fica bloqueado por 15 minutos.
        </p>
      </div>
    </main>
  );
}
