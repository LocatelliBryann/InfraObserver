import { useCallback, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useSearchParams,
} from "react-router";

import { UserMenu } from "./auth/UserMenu";
import { Backdrop } from "./components/Backdrop";
import { BrandMark } from "./components/BrandMark";
import { ClientsSection } from "./components/ClientsSection";
import { DashboardContent } from "./components/DashboardContent";
import { DashboardHeader } from "./components/DashboardHeader";
import { PlatformStatus } from "./components/PlatformStatus";
import { SidebarNavigation } from "./components/SidebarNavigation";
import type { MetricPeriodKey } from "./config/metricPeriods";
import { ROUTES } from "./config/navigation";
import { useAlertHistory } from "./hooks/useAlertHistory";
import { useAlerts } from "./hooks/useAlerts";
import { useClients } from "./hooks/useClients";
import { useEndpointHealth } from "./hooks/useEndpointHealth";
import { useEndpoints } from "./hooks/useEndpoints";
import { useFileEvents } from "./hooks/useFileEvents";
import { useMetrics } from "./hooks/useMetrics";
import {
  CLIENT_FILTER_PARAM,
  clientFilterToUrlValue,
  parseClientFilter,
  type ClientFilter,
} from "./services/clientFilter";
import { endpointsService } from "./services/endpointsService";
import {
  EMPTY_FILE_EVENT_FILTERS,
  type FileEventFilters,
} from "./services/fileEventsService";

const CLIENTS_PAGE_DESCRIPTION =
  "Cada cliente tem tokens de instalação. Um PC instalado com o token recebe uma credencial só dele, que pode ser revogada sem afetar os outros.";

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const onClientsPage = pathname === ROUTES.clients;

  // Filtro por cliente do dashboard (?cliente=3 ou ?cliente=sem). A página de
  // clientes sempre vê todos os PCs.
  const clientFilter = onClientsPage
    ? undefined
    : parseClientFilter(searchParams.get(CLIENT_FILTER_PARAM));

  const changeClientFilter = useCallback(
    (filter: ClientFilter | undefined) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);

        if (filter === undefined) {
          next.delete(CLIENT_FILTER_PARAM);
        } else {
          next.set(CLIENT_FILTER_PARAM, clientFilterToUrlValue(filter));
        }

        return next;
      });
    },
    [setSearchParams],
  );

  const {
    endpoints,
    loading,
    error,
    refresh: refreshEndpoints,
  } = useEndpoints(clientFilter);

  const {
    health,
    loading: healthLoading,
    error: healthError,
    onlineCount,
    availability,
  } = useEndpointHealth(endpoints, clientFilter);

  const {
    alerts,
    loading: alertsLoading,
    error: alertsError,
    refresh: refreshAlerts,
  } = useAlerts(clientFilter);

  const {
    history: alertHistory,
    loading: alertHistoryLoading,
    error: alertHistoryError,
    refresh: refreshAlertHistory,
  } = useAlertHistory(50, clientFilter);

  const {
    clients,
    loading: clientsLoading,
    error: clientsError,
    refresh: refreshClients,
    createClient,
  } = useClients();

  const [selectedEndpointId, setSelectedEndpointId] =
    useState<number | null>(null);

  const [metricPeriod, setMetricPeriod] =
    useState<MetricPeriodKey>("live");
  const [fileEventFilters, setFileEventFilters] = useState<FileEventFilters>(
    EMPTY_FILE_EVENT_FILTERS,
  );

  // O PC escolhido só vale se estiver na lista atual (ao trocar o filtro de
  // cliente, volta para o primeiro PC do cliente).
  const selectedIsListed = endpoints.some(
    (endpoint) => Number(endpoint.id) === selectedEndpointId,
  );
  const activeEndpointId =
    selectedEndpointId !== null && selectedIsListed
      ? selectedEndpointId
      : endpoints[0]
        ? Number(endpoints[0].id)
        : null;

  // RF20: eventos de arquivo do endpoint selecionado.
  const {
    fileEvents,
    loading: fileEventsLoading,
    error: fileEventsError,
    refresh: refreshFileEvents,
  } = useFileEvents(20, activeEndpointId, fileEventFilters);

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
    refresh: refreshMetrics,
  } = useMetrics(activeEndpointId, metricPeriod);

  // O card de recursos sempre mostra a coleta mais recente,
  // inclusive quando o gráfico exibe um período.
  const latestMetric =
    selectedEndpointHealth?.latestMetric ?? metrics[0] ?? null;

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

  const refreshAllData = useCallback(async () => {
    await Promise.all([
      refreshEndpoints(),
      refreshAlerts(),
      refreshAlertHistory(),
      refreshFileEvents(),
      refreshMetrics(),
      refreshClients(),
    ]);
  }, [
    refreshEndpoints,
    refreshAlerts,
    refreshAlertHistory,
    refreshFileEvents,
    refreshMetrics,
    refreshClients,
  ]);

  const revokeEndpoint = useCallback(
    async (endpointId: number) => {
      await endpointsService.revokeEndpoint(endpointId);
      await refreshEndpoints();
    },
    [refreshEndpoints],
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
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <Backdrop />

      <div className="relative z-10 flex min-h-screen flex-col md:flex-row">
        <aside
          className={`relative w-full border-b border-slate-800/80 bg-slate-900/55 p-6 backdrop-blur-xl transition-all duration-300 md:sticky md:top-0 md:h-screen md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r md:border-slate-800/80 ${
            sidebarCollapsed ? "md:w-20" : "md:w-64"
          }`}
        >
          <div
            className={`mb-10 flex items-center gap-3 ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
          >
            <BrandMark size={36} className="shrink-0 text-slate-100" />

            {!sidebarCollapsed && (
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="text-lg font-semibold">
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
          />

          {!sidebarCollapsed && (
            <PlatformStatus
              status={platformStatus}
              description={platformDescription}
            />
          )}

          <UserMenu collapsed={sidebarCollapsed} />
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden">
          <DashboardHeader
            hasApiError={hasApiError}
            isLoading={isLoading}
            onRefresh={refreshAllData}
            {...(onClientsPage
              ? { title: "Clientes", description: CLIENTS_PAGE_DESCRIPTION }
              : {})}
          />

          <Routes>
            <Route
              path={ROUTES.dashboard}
              element={
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
                  endpointHealth={health}
                  metricPeriod={metricPeriod}
                  onMetricPeriodChange={setMetricPeriod}
                  alertHistory={alertHistory}
                  alertHistoryLoading={alertHistoryLoading}
                  alertHistoryError={alertHistoryError}
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
                  fileEventFilters={fileEventFilters}
                  onFileEventFiltersChange={setFileEventFilters}
                  onRevokeEndpoint={revokeEndpoint}
                  clients={clients}
                  clientFilter={clientFilter}
                  onClientFilterChange={changeClientFilter}
                />
              }
            />

            <Route
              path={ROUTES.clients}
              element={
                <div className="io-reveal mx-auto w-full max-w-7xl min-w-0 p-6 md:p-10">
                  <ClientsSection
                    clients={clients}
                    loading={clientsLoading}
                    error={clientsError}
                    onCreateClient={createClient}
                    onChanged={refreshClients}
                    endpoints={endpoints}
                    health={health}
                    onRevokeEndpoint={revokeEndpoint}
                  />
                </div>
              }
            />

            <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;