import {
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  WifiOff,
} from "lucide-react";

interface DashboardHeaderProps {
  hasApiError: boolean;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

export function DashboardHeader({
  hasApiError,
  isLoading,
  onRefresh,
}: DashboardHeaderProps) {
  const statusLabel = hasApiError
    ? "Conexão instável"
    : isLoading
      ? "Atualizando dados"
      : "Dados atualizados";

  const StatusIcon = hasApiError
    ? WifiOff
    : isLoading
      ? LoaderCircle
      : CheckCircle2;

  const statusColor = hasApiError
    ? "text-red-400"
    : isLoading
      ? "text-amber-400"
      : "text-emerald-400";

  return (
    <header className="border-b border-slate-800 bg-slate-950 px-6 py-6 md:px-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-cyan-400">
            Central de monitoramento
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-100 md:text-4xl">
            Visão geral
          </h2>

          <p className="mt-3 text-sm text-slate-400 md:text-base">
            Acompanhe a saúde e o desempenho dos seus endpoints.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div
            className={`flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium ${statusColor}`}
          >
            <StatusIcon
              size={15}
              className={isLoading ? "animate-spin" : ""}
            />

            <span>{statusLabel}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <RefreshCw size={13} />

              <span>Atualização automática a cada 60 segundos</span>
            </div>

            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-300 transition hover:border-cyan-400 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={isLoading ? "animate-spin" : ""}
              />

              <span>{isLoading ? "Atualizando..." : "Atualizar agora"}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}