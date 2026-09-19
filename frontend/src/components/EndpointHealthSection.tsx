
import type { Metric } from "../services/metricsService";
import { EndpointResourceSummary } from "./EndpointResourceSummary";

interface EndpointHealthSectionProps {
  endpoint: {
    id: number;
    hostname: string;
    status: string;
  } | null;
  metric: Metric | null;
}

export function EndpointHealthSection({
  endpoint,
  metric,
}: EndpointHealthSectionProps) {
  if (!endpoint) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold text-white">
          Saúde do endpoint
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          Selecione um endpoint para visualizar seus detalhes.
        </p>
      </section>
    );
  }

  const isOnline = endpoint.status.toLowerCase() === "online";

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Endpoint selecionado
          </p>

          <h2 className="mt-1 text-lg font-semibold text-white">
            {endpoint.hostname}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            ID: {endpoint.id}
          </p>
        </div>

        <span
          className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${
            isOnline
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-rose-500/10 text-rose-400"
          }`}
        >
          {isOnline ? "Operacional" : "Indisponível"}
        </span>
      </div>

      <div className="mt-6 border-t border-slate-800 pt-6">
        <h3 className="mb-5 text-sm font-semibold text-slate-200">
          Recursos do sistema
        </h3>

        <EndpointResourceSummary metric={metric} />
      </div>
    </section>
  );
}