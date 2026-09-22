interface DashboardHeaderProps {
  hasApiError: boolean;
  isLoading: boolean;
}

export function DashboardHeader({
  hasApiError,
  isLoading,
}: DashboardHeaderProps) {
  const statusLabel = isLoading
    ? "Carregando dados"
    : hasApiError
      ? "API indisponível"
      : "API conectada";

  const statusColor = hasApiError
    ? "bg-red-400"
    : isLoading
      ? "bg-amber-400"
      : "bg-emerald-400";

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 px-6 py-6 md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-1 text-sm text-cyan-400">
            Central de monitoramento
          </p>

          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Visão geral
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Acompanhe a saúde e o desempenho dos seus endpoints.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2">
          <span
            className={`h-2 w-2 rounded-full ${statusColor}`}
          />

          <span className="text-xs text-slate-300">
            {statusLabel}
          </span>
        </div>
      </div>
    </header>
  );
}