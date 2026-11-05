import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Monitor,
} from "lucide-react";

import { AlertsSection } from "./AlertsSection";
import { EmptyState } from "./EmptyState";
import { EndpointHealthSection } from "./EndpointHealthSection";
import { EndpointStatusList } from "./EndpointStatusList";
import { MetricsChart } from "./MetricsChart";

import {
  METRIC_PERIODS,
  METRIC_PERIOD_KEYS,
  type MetricPeriodKey,
} from "../config/metricPeriods";
import type { Alert } from "../services/alertsService";
import type {
  EndpointHealth,
  EndpointStatus,
} from "../services/endpointHealthService";
import type { Endpoint } from "../services/endpointsService";
import type { FileEvent } from "../services/fileEventsService";
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
}: DashboardContentProps) {
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
        aria-labelledby="overview-heading"
        className="min-w-0"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3
            id="overview-heading"
            className="text-lg font-semibold text-slate-100"
          >
            Indicadores principais
          </h3>

          <Activity
            className="shrink-0 text-slate-500"
            size={20}
          />
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
          />
        </div>
      </section>

      <AlertsSection
        alerts={alerts}
        loading={alertsLoading}
        error={alertsError}
        endpoints={endpoints}
        history={alertHistory}
        historyLoading={alertHistoryLoading}
        historyError={alertHistoryError}
      />

      <section
        aria-labelledby="metrics-heading"
        className="min-w-0"
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
        aria-labelledby="health-heading"
        className="min-w-0"
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
        />

        <EndpointHealthSection
          endpoint={
            selectedEndpoint
              ? {
                  id: Number(selectedEndpoint.id),
                  hostname: selectedEndpoint.hostname,
                  status: selectedStatus,
                  activeAlerts: selectedEndpointHealth?.activeAlerts,
                }
              : null
          }
          metric={latestMetric}
        />
      </section>

      <section
        aria-labelledby="activity-heading"
        className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-6"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="shrink-0 rounded-xl bg-violet-500/10 p-3 text-violet-400">
            <Activity size={21} />
          </div>

          <div className="min-w-0">
            <h3
              id="activity-heading"
              className="font-semibold"
            >
              Atividade recente
            </h3>

            <p className="text-sm text-slate-400">
              {selectedEndpoint
                ? `Eventos de arquivo detectados em ${selectedEndpoint.hostname}.`
                : "Eventos e alterações detectadas nos endpoints."}
            </p>
          </div>
        </div>

        {fileEventsLoading && fileEvents.length === 0 ? (
          <StatusMessage>
            Carregando atividades recentes...
          </StatusMessage>
        ) : fileEventsError ? (
          <StatusMessage error>
            Não foi possível carregar as atividades recentes.
          </StatusMessage>
        ) : fileEvents.length === 0 ? (
          <EmptyState
            title="Nenhuma atividade registrada"
            description="Os eventos detectados nos endpoints aparecerão nesta seção."
          />
        ) : (
          <div className="min-w-0 space-y-3">
            {fileEvents.map((event) => (
              <article
                key={event.id}
                className="min-w-0 rounded-xl border border-slate-700 bg-slate-950/40 p-4"
              >
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-100">
                      {event.eventType}
                    </p>

                    <p className="mt-1 break-words text-xs text-slate-400">
                      {event.endpoint.hostname}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs text-slate-500">
                    {new Date(
                      event.occurredAt,
                    ).toLocaleString("pt-BR")}
                  </span>
                </div>

                <p className="mt-3 break-all text-xs text-slate-400">
                  {event.filePath}
                </p>

                <p className="mt-2 break-words text-xs text-slate-500">
                  Usuário: {event.username}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
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
      className={`flex min-h-64 min-w-0 items-center justify-center rounded-2xl border bg-slate-900 p-6 text-sm ${
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
    <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-slate-700">
      <div className="mb-5 flex items-center justify-between">
        <div
          className={`shrink-0 rounded-xl p-3 ${accentClasses[accent]}`}
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

      <p className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-100">
        {value}
      </p>

      <p className="mt-2 break-words text-xs text-slate-500">
        {description}
      </p>
    </article>
  );
}