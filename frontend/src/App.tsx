
import { useState } from "react";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  LayoutDashboard,
  Monitor,
  ShieldCheck,
  Wifi,
} from "lucide-react";

import { EndpointHealthSection } from "./components/EndpointHealthSection";
import { MetricsChart } from "./components/MetricsChart";
import { useEndpoints } from "./hooks/useEndpoints";
import { useMetrics } from "./hooks/useMetrics";

function App() {
  const { endpoints, loading, error } = useEndpoints();

  const [selectedEndpointId, setSelectedEndpointId] = useState<number | null>(
    null,
  );

  const activeEndpointId =
    selectedEndpointId ?? (endpoints[0] ? Number(endpoints[0].id) : null);

  const selectedEndpoint = endpoints.find(
    (endpoint) => Number(endpoint.id) === activeEndpointId,
  );

  const {
    metrics,
    loading: metricsLoading,
    error: metricsError,
  } = useMetrics(activeEndpointId);

  const latestMetric = metrics[0] ?? null;

  const onlineEndpoints = endpoints.filter(
    (endpoint) => endpoint.status === "ONLINE",
  );

  const monitoredEndpointsValue = loading
    ? "—"
    : String(endpoints.length);

  const onlineEndpointsValue = loading
    ? "—"
    : String(onlineEndpoints.length);

  const platformStatus = loading
    ? "Carregando dados..."
    : error
      ? "Erro na conexão com a API"
      : "API conectada";

  const platformDescription = loading
    ? "Buscando endpoints registrados"
    : error
      ? "Não foi possível carregar os endpoints"
      : "Monitoramento operacional";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="w-full border-b border-slate-800 bg-slate-900 p-6 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
          <div className="mb-10 flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500/15 p-2 text-cyan-400">
              <ShieldCheck size={26} />
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                InfraObserver
              </h1>

              <p className="text-xs text-slate-400">
                Endpoint Monitoring
              </p>
            </div>
          </div>

          <nav aria-label="Navegação principal">
            <div className="flex items-center gap-3 rounded-xl bg-cyan-500/10 px-4 py-3 text-cyan-400">
              <LayoutDashboard size={19} />
              <span className="text-sm font-medium">Dashboard</span>
            </div>
          </nav>

          <div className="mt-10 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="mb-2 flex items-center gap-2 text-emerald-400">
              <Wifi size={16} />

              <span className="text-xs font-semibold uppercase tracking-wide">
                Status da plataforma
              </span>
            </div>

            <p className="text-sm text-slate-300">{platformStatus}</p>

            <p className="mt-1 text-xs text-slate-500">
              {platformDescription}
            </p>
          </div>
        </aside>

        <main className="flex-1 overflow-hidden">
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
                  className={`h-2 w-2 rounded-full ${
                    error
                      ? "bg-red-400"
                      : loading
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                  }`}
                />

                <span className="text-xs text-slate-300">
                  {loading
                    ? "Carregando dados"
                    : error
                      ? "API indisponível"
                      : "API conectada"}
                </span>
              </div>
            </div>
          </header>

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
                    loading
                      ? "Carregando status..."
                      : "Endpoints com status online"
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
                  value="—"
                  description="Dados ainda não disponíveis"
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
                        status: selectedEndpoint.status,
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
        </main>
      </div>
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

export default App;