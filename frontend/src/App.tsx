import { useState } from "react";

import {
  LayoutDashboard,
  ShieldCheck,
  Wifi,
} from "lucide-react";

import { DashboardContent } from "./components/DashboardContent";
import { useAlerts } from "./hooks/useAlerts";
import { useEndpointHealth } from "./hooks/useEndpointHealth";
import { useEndpoints } from "./hooks/useEndpoints";
import { useMetrics } from "./hooks/useMetrics";

function App() {
  const { endpoints, loading, error } = useEndpoints();

  const {
    health,
    loading: healthLoading,
    error: healthError,
    onlineCount,
    availability,
  } = useEndpointHealth(endpoints);

  const {
    alerts,
    loading: alertsLoading,
    error: alertsError,
  } = useAlerts();

  const [selectedEndpointId, setSelectedEndpointId] = useState<number | null>(
    null,
  );

  const activeEndpointId =
    selectedEndpointId ??
    (endpoints[0] ? Number(endpoints[0].id) : null);

  const selectedEndpoint = endpoints.find(
    (endpoint) => Number(endpoint.id) === activeEndpointId,
  );

  const selectedEndpointHealth = health.find(
    (item) => item.endpointId === activeEndpointId,
  );

  const {
    metrics,
    loading: metricsLoading,
    error: metricsError,
  } = useMetrics(activeEndpointId);

  const latestMetric = metrics[0] ?? null;

  const platformStatus =
    loading || healthLoading || alertsLoading
      ? "Carregando dados..."
      : error || healthError || alertsError
        ? "Erro na conexão com a API"
        : "API conectada";

  const platformDescription = loading
    ? "Buscando endpoints registrados"
    : error
      ? "Não foi possível carregar os endpoints"
      : healthError
        ? "Erro ao verificar saúde dos endpoints"
        : alertsError
          ? "Erro ao carregar alertas"
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
                    error || healthError || alertsError
                      ? "bg-red-400"
                      : loading || healthLoading || alertsLoading
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                  }`}
                />

                <span className="text-xs text-slate-300">
                  {loading || healthLoading || alertsLoading
                    ? "Carregando dados"
                    : error || healthError || alertsError
                      ? "API indisponível"
                      : "API conectada"}
                </span>
              </div>
            </div>
          </header>

          <DashboardContent
            endpoints={endpoints}
            loading={loading}
            error={error}
            healthLoading={healthLoading}
            healthError={healthError}
            onlineCount={onlineCount}
            availability={availability}
            selectedEndpoint={selectedEndpoint ?? null}
            selectedEndpointHealth={selectedEndpointHealth}
            activeEndpointId={activeEndpointId}
            setSelectedEndpointId={setSelectedEndpointId}
            metrics={metrics}
            metricsLoading={metricsLoading}
            metricsError={metricsError}
            latestMetric={latestMetric}
            alerts={alerts}
            alertsLoading={alertsLoading}
            alertsError={alertsError}
          />
        </main>
      </div>
    </div>
  );
}

export default App;