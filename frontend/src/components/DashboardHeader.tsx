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
  title?: string;
  description?: string;
}

export function DashboardHeader({
  hasApiError,
  isLoading,
  onRefresh,
  title = "Visão geral",
  description = "Acompanhe a saúde e o desempenho dos seus endpoints.",
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
    <header className="io-hero border-b border-slate-800/80 px-6 py-8 md:px-10 md:py-10">
      <div className="io-radar" aria-hidden="true">
        <span className="io-radar-blip" style={{ top: "30%", left: "36%" }} />
        <span
          className="io-radar-blip"
          style={{ top: "62%", left: "24%", animationDelay: "-2.2s" }}
        />
        <span
          className="io-radar-blip"
          style={{ top: "44%", left: "70%", animationDelay: "-4.1s" }}
        />
      </div>

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-cyan-400">
            Central de monitoramento
          </p>

          <h2
            key={title}
            className="io-title mt-2 text-3xl font-semibold text-slate-100 md:text-5xl"
          >
            {title}
          </h2>

          <p className="mt-3 max-w-xl text-sm text-slate-400 md:text-base">
            {description}
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div
            className={`flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-xs font-medium backdrop-blur ${statusColor}`}
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

              <span>Atualização automática a cada 30 segundos</span>
            </div>

            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={isLoading}
              className="io-glow-button inline-flex items-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-3.5 py-2 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50"
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