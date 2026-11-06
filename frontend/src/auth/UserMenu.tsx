import { LogOut } from "lucide-react";

import { useAuth } from "./AuthContext";

interface UserMenuProps {
  collapsed: boolean;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";

  return `${first}${last}`.toUpperCase();
}

// Usuário logado e botão de sair, no rodapé da barra lateral.
export function UserMenu({ collapsed }: UserMenuProps) {
  const auth = useAuth();

  if (!auth?.user) {
    return null;
  }

  const { user, logout } = auth;

  return (
    <div
      className={`mt-6 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 ${
        collapsed ? "flex-col" : ""
      }`}
    >
      <div
        aria-hidden="true"
        title={collapsed ? `${user.name} (${user.email})` : undefined}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-xs font-semibold text-cyan-300"
      >
        {initials(user.name)}
      </div>

      {!collapsed && (
        <div className="min-w-0 flex-1" title={`${user.name} (${user.email})`}>
          <p className="truncate text-sm font-medium text-slate-200">
            {user.name}
          </p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => void logout()}
        aria-label="Sair"
        title="Sair"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
