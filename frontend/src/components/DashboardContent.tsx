
import { Activity, AlertTriangle, CheckCircle2, Monitor } from "lucide-react";

import { EndpointHealthSection } from "./EndpointHealthSection";
import { MetricsChart } from "./MetricsChart";
import type { Endpoint } from "../services/endpointsService";
import type { Metric } from "../services/metricsService";

interface DashboardContentProps {
  endpoints: Endpoint[];
  loading: boolean;
  error: string | null;
  healthLoading: boolean;
  healthError: string | null;
  onlineCount: number;
  availability: number | null;
  selectedEndpoint: Endpoint | null;
  selectedEndpointHealth: {
    isOnline: boolean;
  } | undefined;
  activeEndpointId: number | null;
  setSelectedEndpointId: (id: number | null) => void;
  metrics: Metric[];
  metricsLoading: boolean;
  metricsError: string | null;
  latestMetric: Metric | null;
}

export function DashboardContent({
  endpoints,
  loading,
  error,
  healthLoading,
  healthError,
  onlineCount,
  availability,
  selectedEndpoint,
  selectedEndpointHealth,
  activeEndpointId,
  setSelectedEndpointId,
  metrics,
  metricsLoading,
  metricsError,
  latestMetric,
}: DashboardContentProps) {
  const monitoredEndpointsValue = loading
    ? "—"
    : String(endpoints.length);

  const onlineEndpointsValue =
    loading || healthLoading ? "—" : String(onlineCount);

  const availabilityValue =
    loading || healthLoading || availability === null
      ? "—"
      : `${availability.toFixed(1)}%`;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
      <section aria-labelledby="overview-heading">
        <div className="mb-4 flex items-center justify-between">
          <h3
            id="overview-heading"
            className="text-lg font-semibold text-slate-100"
          >
            Indicadores principais
          </h3>

          <Activity className="text-slate-500" size={20} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Endpoints monitorados"
            value={monitoredEndpointsValue}
            description={
              loading
                ? "Carregando endpoints..."
                : error
                  ? "Não foi possível carregar os endpoints"
                  : `${endpoints.length} endpoint(s) registrado(s)`
            }
            icon={<Monitor size={21} />}
            accent="cyan"
          />

          <MetricCard
            title="Endpoints online"
            value={onlineEndpointsValue}
            description={
              healthLoading
                ? "Verificando saúde..."
                : healthError
                  ? "Erro ao verificar status"
                  : "Endpoints com métricas recentes"
            }
            icon={<CheckCircle2 size={21} />}
            accent="emerald"
          />

          <MetricCard
            title="Alertas ativos"
            value="0"
            description="Nenhum alerta registrado"
            icon={<AlertTriangle size={21} />}
            accent="amber"
          />

          <MetricCard
            title="Disponibilidade"
            value={availabilityValue}
            description={
              healthError
                ? "Não foi possível verificar a saúde"
                : "Endpoints com métricas recentes"
            }
            icon={<Activity size={21} />}
            accent="violet"
          />
        </div>
      </section>

      <section aria-labelledby="metrics-heading">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3
            id="metrics-heading"
            className="text-lg font-semibold text-slate-100"
          >
            Histórico de métricas
          </h3>

          <div className="flex items-center gap-3">
            <label
              htmlFor="endpoint-select"
              className="text-xs text-slate-400"
            >
              Endpoint
            </label>

            <select
              id="endpoint-select"
              value={activeEndpointId ?? ""}
              onChange={(event) =>
                setSelectedEndpointId(
                  event.target.value
                    ? Number(event.target.value)
                    : null,
                )
              }
              disabled={loading || endpoints.length === 0}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
            >
              {endpoints.length === 0 ? (
                <option value="">Nenhum endpoint</option>
              ) : (
                endpoints.map((endpoint) => (
                  <option
                    key={endpoint.id}
                    value={Number(endpoint.id)}
                  >
                    {endpoint.hostname}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {metricsLoading ? (
          <StatusMessage>Carregando métricas...</StatusMessage>
        ) : metricsError ? (
          <StatusMessage error>
            Não foi possível carregar as métricas.
          </StatusMessage>
        ) : activeEndpointId === null ? (
          <StatusMessage>
            Nenhum endpoint disponível para exibir métricas.
          </StatusMessage>
        ) : (
          <MetricsChart metrics={metrics} />
        )}
      </section>

      <section aria-labelledby="health-heading">
        <div className="mb-4 flex items-center justify-between">
          <h3
            id="health-heading"
            className="text-lg font-semibold text-slate-100"
          >
            Saúde do sistema
          </h3>

          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
            Endpoint selecionado
          </span>
        </div>

        <EndpointHealthSection
          endpoint={
            selectedEndpoint
              ? {
                  id: Number(selectedEndpoint.id),
                  hostname: selectedEndpoint.hostname,
                  status: selectedEndpointHealth?.isOnline
                    ? "ONLINE"
                    : "OFFLINE",
                }
              : null
          }
          metric={latestMetric}
        />
      </section>

      <section
        aria-labelledby="activity-heading"
        className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-violet-500/10 p-3 text-violet-400">
            <Activity size={21} />
          </div>

          <div>
            <h3 id="activity-heading" className="font-semibold">
              Atividade recente
            </h3>

            <p className="text-sm text-slate-400">
              Eventos e alterações detectadas nos endpoints.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-slate-700 px-5 py-8 text-center">
          <p className="text-sm text-slate-400">
            Nenhuma atividade registrada até o momento.
          </p>
        </div>
      </section>
    </div>
  );
}

type StatusMessageProps = {
  children: React.ReactNode;
  error?: boolean;
};

function StatusMessage({ children, error = false }: StatusMessageProps) {
  return (
    <div
      className={`flex min-h-64 items-center justify-center rounded-2xl border bg-slate-900 p-6 text-sm ${
        error
          ? "border-red-900/50 text-red-400"
          : "border-slate-800 text-slate-400"
      }`}
    >
      {children}
    </div>
  );
}

type MetricCardProps = {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  accent: "cyan" | "emerald" | "amber" | "violet";
};

function MetricCard({
  title,
  value,
  description,
  icon,
  accent,
}: MetricCardProps) {
  const accentClasses = {
    cyan: "bg-cyan-500/10 text-cyan-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
    violet: "bg-violet-500/10 text-violet-400",
  };

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-slate-700">
      <div className="mb-5 flex items-center justify-between">
        <div
          className={`rounded-xl p-3 ${accentClasses[accent]}`}
          aria-hidden="true"
        >
          {icon}
        </div>

        <span className="text-xs text-slate-500">
          {accent === "cyan" || accent === "emerald" ? "API" : "Demo"}
        </span>
      </div>

      <p className="text-sm text-slate-400">{title}</p>

      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-100">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </article>
  );
}