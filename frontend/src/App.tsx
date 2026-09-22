import { useState } from "react";

import { ShieldCheck } from "lucide-react";

import { DashboardContent } from "./components/DashboardContent";
import { DashboardHeader } from "./components/DashboardHeader";
import { PlatformStatus } from "./components/PlatformStatus";
import { SidebarNavigation } from "./components/SidebarNavigation";
import { useAlerts } from "./hooks/useAlerts";
import { useEndpointHealth } from "./hooks/useEndpointHealth";
import { useEndpoints } from "./hooks/useEndpoints";
import { useFileEvents } from "./hooks/useFileEvents";
import { useMetrics } from "./hooks/useMetrics";

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  const {
    fileEvents,
    loading: fileEventsLoading,
    error: fileEventsError,
  } = useFileEvents();

  const [selectedEndpointId, setSelectedEndpointId] =
    useState<number | null>(null);

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

  const isLoading =
    loading ||
    healthLoading ||
    alertsLoading ||
    fileEventsLoading ||
    metricsLoading;

  const hasApiError = Boolean(
    error ||
      healthError ||
      alertsError ||
      fileEventsError ||
      metricsError,
  );

  const platformStatus = isLoading
    ? "Carregando dados..."
    : hasApiError
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
          : fileEventsError
            ? "Erro ao carregar eventos recentes"
            : metricsError
              ? "Erro ao carregar métricas"
              : "Monitoramento operacional";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside
          className={`relative w-full border-b border-slate-800 bg-slate-900 p-6 transition-all duration-300 md:min-h-screen md:border-b-0 md:border-r ${
            sidebarCollapsed ? "md:w-20" : "md:w-64"
          }`}
        >
          <div
            className={`mb-10 flex items-center gap-3 ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
          >
            <div className="shrink-0 rounded-xl bg-cyan-500/15 p-2 text-cyan-400">
              <ShieldCheck size={26} />
            </div>

            {!sidebarCollapsed && (
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="text-lg font-bold tracking-tight">
                  InfraObserver
                </h1>

                <p className="text-xs text-slate-400">
                  Endpoint Monitoring
                </p>
              </div>
            )}
          </div>

          <SidebarNavigation
            collapsed={sidebarCollapsed}
            onToggle={() =>
              setSidebarCollapsed((current) => !current)
            }
            activeItem="dashboard"
          />

          {!sidebarCollapsed && (
            <PlatformStatus
              status={platformStatus}
              description={platformDescription}
            />
          )}
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden">
          <DashboardHeader
            hasApiError={hasApiError}
            isLoading={isLoading}
          />

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
            fileEvents={fileEvents}
            fileEventsLoading={fileEventsLoading}
            fileEventsError={fileEventsError}
          />
        </main>
      </div>
    </div>
  );
}

export default App;