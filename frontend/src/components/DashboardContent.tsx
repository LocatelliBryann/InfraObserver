import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Monitor,
} from "lucide-react";

import { useEffect, type CSSProperties } from "react";

import { AlertsSection } from "./AlertsSection";
import { ClientFilterSelect } from "./ClientFilterSelect";
import { EmptyState } from "./EmptyState";
import { EndpointHealthSection } from "./EndpointHealthSection";
import { EndpointStatusList } from "./EndpointStatusList";
import { FileEventsSection } from "./FileEventsSection";
import { MetricsChart } from "./MetricsChart";

import { DASHBOARD_SECTIONS } from "../config/navigation";
import {
  METRIC_PERIODS,
  METRIC_PERIOD_KEYS,
  type MetricPeriodKey,
} from "../config/metricPeriods";
import type { Alert } from "../services/alertsService";
import type { ClientFilter } from "../services/clientFilter";
import type { Client } from "../services/clientsService";
import type {
  EndpointHealth,
  EndpointStatus,
} from "../services/endpointHealthService";
import type { Endpoint } from "../services/endpointsService";
import type {
  FileEvent,
  FileEventFilters,
} from "../services/fileEventsService";
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
    status?: EndpointStatus;
    activeAlerts?: number;
  } | undefined;
  endpointHealth?: EndpointHealth[];
  metricPeriod?: MetricPeriodKey;
  onMetricPeriodChange?: (period: MetricPeriodKey) => void;
  alertHistory?: Alert[];
  alertHistoryLoading?: boolean;
  alertHistoryError?: string | null;
  activeEndpointId: number | null;
  setSelectedEndpointId: (id: number | null) => void;
  metrics: Metric[];
  metricsLoading: boolean;
  metricsError: string | null;
  latestMetric: Metric | null;
  alerts: Alert[];
  alertsLoading: boolean;
  alertsError: string | null;
  fileEvents: FileEvent[];
  fileEventsLoading: boolean;
  fileEventsError: string | null;
  fileEventFilters?: FileEventFilters;
  onFileEventFiltersChange?: (filters: FileEventFilters) => void;
  onRevokeEndpoint?: (endpointId: number) => Promise<void>;
  // Filtro por cliente no topo; sem onClientFilterChange, o seletor não aparece.
  clients?: Client[];
  clientFilter?: ClientFilter;
  onClientFilterChange?: (filter: ClientFilter | undefined) => void;
}

const NO_CLIENTS: Client[] = [];
const NO_CLIENT_LABEL = "Sem cliente";

// Ordem de entrada de cada bloco na animação de abertura da página.
function revealOrder(index: number): CSSProperties {
  return { "--i": index } as CSSProperties;
}

// Vindo de outra página (/#alertas), rola até a seção depois de montar.
function useScrollToHash() {
  useEffect(() => {
    const id = globalThis.location?.hash.replace("#", "");

    if (id) {
      document.getElementById(id)?.scrollIntoView?.();
    }
  }, []);
}

const NO_FILE_EVENT_FILTERS: FileEventFilters = { eventTypes: [], search: "" };
const ignoreFilterChange = () => {};

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
  endpointHealth = [],
  metricPeriod = "live",
  onMetricPeriodChange,
  alertHistory,
  alertHistoryLoading,
  alertHistoryError,
  activeEndpointId,
  setSelectedEndpointId,
  metrics,
  metricsLoading,
  metricsError,
  latestMetric,
  alerts,
  alertsLoading,
  alertsError,
  fileEvents,
  fileEventsLoading,
  fileEventsError,
  fileEventFilters = NO_FILE_EVENT_FILTERS,
  onFileEventFiltersChange = ignoreFilterChange,
  onRevokeEndpoint,
  clients = NO_CLIENTS,
  clientFilter,
  onClientFilterChange,
}: DashboardContentProps) {
  useScrollToHash();

  // Com todos os clientes na tela, cada PC mostra de qual cliente é.
  const clientNames =
    clientFilter === undefined
      ? new Map(
          endpoints.map((endpoint) => [
            Number(endpoint.id),
            endpoint.client?.name ?? NO_CLIENT_LABEL,
          ]),
        )
      : undefined;

  const monitoredEndpointsValue = loading
    ? "—"
    : String(endpoints.length);

  const onlineEndpointsValue =
    loading || healthLoading
      ? "—"
      : String(onlineCount);

  const availabilityValue =
    loading ||
    healthLoading ||
    availability === null
      ? "—"
      : `${availability.toFixed(1)}%`;

  const activeAlertsValue = alertsLoading
    ? "—"
    : String(alerts.length);

  const selectedStatus: EndpointStatus =
    selectedEndpointHealth?.status ??
    (selectedEndpointHealth?.isOnline ? "ONLINE" : "OFFLINE");

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 p-6 md:p-10">
      <section
        id={DASHBOARD_SECTIONS.overview}
        aria-labelledby="overview-heading"
        className="io-reveal min-w-0 scroll-mt-6"
        style={revealOrder(0)}
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3
            id="overview-heading"
            className="text-lg font-semibold text-slate-100"
          >
            Indicadores principais
          </h3>

          {onClientFilterChange ? (
            <ClientFilterSelect
              clients={clients}
              value={clientFilter}
              onChange={onClientFilterChange}
            />
          ) : (
            <Activity
              className="shrink-0 text-slate-500"
              size={20}
            />
          )}
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Endpoints monitorados"
            value={monitoredEndpointsValue}
            description={
              loading
                ? "Carregando endpoints..."
                : error
                  ? "Não foi possível carregar os endpoints"
                  : endpoints.length === 0
                    ? "Nenhum endpoint registrado"
                    : `${endpoints.length} endpoint(s) registrado(s)`
            }
            icon={<Monitor size={21} />}
            accent="cyan"
            order={0}
          />

          <MetricCard
            title="Endpoints online"
            value={onlineEndpointsValue}
            description={
              healthLoading
                ? "Verificando saúde..."
                : healthError
                  ? "Erro ao verificar status"
                  : endpoints.length === 0
                    ? "Nenhum endpoint disponível"
                    : "Endpoints com métricas recentes"
            }
            icon={<CheckCircle2 size={21} />}
            accent="emerald"
            order={1}
          />

          <MetricCard
            title="Alertas ativos"
            value={activeAlertsValue}
            description={
              alertsLoading
                ? "Carregando alertas..."
                : alertsError
                  ? "Erro ao carregar alertas"
                  : alerts.length === 0
                    ? "Nenhum alerta ativo"
                    : "Alertas que exigem atenção"
            }
            icon={<AlertTriangle size={21} />}
            accent="amber"
            order={2}
          />

          <MetricCard
            title="Disponibilidade"
            value={availabilityValue}
            description={
              healthError
                ? "Não foi possível verificar a saúde"
                : endpoints.length === 0
                  ? "Nenhum endpoint disponível"
                  : "Endpoints com métricas recentes"
            }
            icon={<Activity size={21} />}
            accent="violet"
            order={3}
          />
        </div>
      </section>

      <div className="io-reveal" style={revealOrder(1)}>
      <AlertsSection
        alerts={alerts}
        loading={alertsLoading}
        error={alertsError}
        endpoints={endpoints}
        history={alertHistory}
        historyLoading={alertHistoryLoading}
        historyError={alertHistoryError}
      />
      </div>

      <section
        id={DASHBOARD_SECTIONS.metrics}
        aria-labelledby="metrics-heading"
        className="io-reveal min-w-0 scroll-mt-6"
        style={revealOrder(2)}
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3
            id="metrics-heading"
            className="text-lg font-semibold text-slate-100"
          >
            Histórico de métricas
          </h3>

          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {onMetricPeriodChange && (
              <div
                role="group"
                aria-label="Período do histórico"
                className="flex rounded-lg border border-slate-700 p-0.5 text-xs"
              >
                {METRIC_PERIOD_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={metricPeriod === key}
                    onClick={() => onMetricPeriodChange(key)}
                    className={`rounded-md px-3 py-1 font-medium transition-colors ${
                      metricPeriod === key
                        ? "bg-slate-700 text-slate-100"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {METRIC_PERIODS[key].label}
                  </button>
                ))}
              </div>
            )}

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
              disabled={
                loading ||
                endpoints.length === 0
              }
              className="min-w-0 max-w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
            >
              {endpoints.length === 0 ? (
                <option value="">
                  Nenhum endpoint
                </option>
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

        {metricsLoading && metrics.length === 0 ? (
          <StatusMessage>
            Carregando métricas...
          </StatusMessage>
        ) : metricsError ? (
          <StatusMessage error>
            Não foi possível carregar as métricas.
          </StatusMessage>
        ) : activeEndpointId === null ? (
          <EmptyState
            title="Nenhum endpoint disponível"
            description="Cadastre um endpoint para começar a visualizar suas métricas."
          />
        ) : metrics.length === 0 ? (
          <EmptyState
            title="Nenhuma métrica disponível"
            description={
              metricPeriod === "live"
                ? "Ainda não foram coletadas métricas para o endpoint selecionado."
                : `Nenhuma métrica coletada nas últimas ${METRIC_PERIODS[metricPeriod].label}.`
            }
          />
        ) : (
          <div className="min-w-0">
            <MetricsChart metrics={metrics} />
          </div>
        )}
      </section>

      <section
        id={DASHBOARD_SECTIONS.endpoints}
        aria-labelledby="health-heading"
        className="io-reveal min-w-0 scroll-mt-6"
        style={revealOrder(3)}
      >
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

        <EndpointStatusList
          health={endpointHealth}
          activeEndpointId={activeEndpointId}
          onSelect={(endpointId) => setSelectedEndpointId(endpointId)}
          clientNames={clientNames}
        />

        <EndpointHealthSection
          endpoint={
            selectedEndpoint
              ? {
                  id: Number(selectedEndpoint.id),
                  hostname: selectedEndpoint.hostname,
                  status: selectedStatus,
                  activeAlerts: selectedEndpointHealth?.activeAlerts,
                  ipAddress: selectedEndpoint.ipAddress,
                  osName: selectedEndpoint.osName,
                  osVersion: selectedEndpoint.osVersion,
                  agentVersion: selectedEndpoint.agentVersion,
                  clientName: selectedEndpoint.client?.name,
                  revokedAt: selectedEndpoint.credentialRevokedAt,
                }
              : null
          }
          metric={latestMetric}
          onRevoke={onRevokeEndpoint}
        />
      </section>

      <div className="io-reveal" style={revealOrder(4)}>
      <FileEventsSection
        events={fileEvents}
        loading={fileEventsLoading}
        error={fileEventsError}
        hostname={selectedEndpoint?.hostname}
        filters={fileEventFilters}
        onFiltersChange={onFileEventFiltersChange}
      />
      </div>
    </div>
  );
}

type StatusMessageProps = {
  children: React.ReactNode;
  error?: boolean;
};

function StatusMessage({
  children,
  error = false,
}: StatusMessageProps) {
  return (
    <div
      className={`io-card flex min-h-64 min-w-0 items-center justify-center rounded-2xl border bg-slate-900 p-6 text-sm ${
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
  // Posição do cartão, para a faixa de luz passar em sequência.
  order?: number;
};

function MetricCard({
  title,
  value,
  description,
  icon,
  accent,
  order = 0,
}: MetricCardProps) {
  const accentClasses = {
    cyan: "bg-cyan-500/10 text-cyan-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
    violet: "bg-violet-500/10 text-violet-400",
  };

  return (
    <article className="min-w-0 io-card rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <span className="io-shine" style={revealOrder(order)} aria-hidden="true" />

      <div className="mb-5 flex items-center justify-between">
        <div
          className={`io-stat-icon shrink-0 rounded-xl p-3 ${accentClasses[accent]}`}
          aria-hidden="true"
        >
          {icon}
        </div>

        <span className="shrink-0 text-xs text-slate-500">
          API
        </span>
      </div>

      <p className="break-words text-sm text-slate-400">
        {title}
      </p>

      <p className="io-stat-value mt-2 break-words text-4xl font-semibold text-slate-100">
        {value}
      </p>

      <p className="mt-2 break-words text-xs text-slate-500">
        {description}
      </p>
    </article>
  );
}