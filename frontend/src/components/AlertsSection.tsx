import { useState } from "react";

import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  History,
  Info,
} from "lucide-react";

import type { Alert } from "../services/alertsService";
import type { Endpoint } from "../services/endpointsService";

type AlertsTab = "active" | "history";

interface AlertsSectionProps {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  endpoints: Endpoint[];
  // RF12: quando informado, exibe a aba de histórico de alertas resolvidos.
  history?: Alert[];
  historyLoading?: boolean;
  historyError?: string | null;
}

const METRIC_TYPE_LABELS: Record<string, string> = {
  CPU: "CPU",
  MEMORY: "Memória",
  DISK: "Disco",
  OFFLINE: "Endpoint offline",
};

function getMetricTypeLabel(metricType: string): string {
  return METRIC_TYPE_LABELS[metricType.toUpperCase()] ?? metricType;
}

function getThresholdLabel(alert: Alert): string {
  return alert.metricType.toUpperCase() === "OFFLINE"
    ? `${alert.thresholdValue}s sem dados`
    : `${alert.thresholdValue}%`;
}

function formatDuration(from: string, to: string): string {
  const totalMinutes = Math.max(
    0,
    Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000),
  );

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

function getSeverityClass(severity: string): string {
  switch (severity.toUpperCase()) {
    case "CRITICAL":
      return "border-red-500/30 bg-red-500/10 text-red-400";

    case "HIGH":
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";

    default:
      return "border-blue-500/30 bg-blue-500/10 text-blue-400";
  }
}

function getSeverityIcon(severity: string) {
  switch (severity.toUpperCase()) {
    case "CRITICAL":
      return <CircleAlert size={14} />;

    case "HIGH":
      return <AlertTriangle size={14} />;

    default:
      return <Info size={14} />;
  }
}

export function AlertsSection({
  alerts,
  loading,
  error,
  endpoints,
  history,
  historyLoading = false,
  historyError = null,
}: AlertsSectionProps) {
  const [activeTab, setActiveTab] = useState<AlertsTab>("active");

  const hasHistory = history !== undefined;
  const showingHistory = hasHistory && activeTab === "history";

  const visibleAlerts = showingHistory ? history : alerts;
  const visibleLoading = showingHistory ? historyLoading : loading;
  const visibleError = showingHistory ? historyError : error;

  function getEndpoint(
    endpointId: number,
  ): Endpoint | undefined {
    return endpoints.find(
      (item) => Number(item.id) === endpointId,
    );
  }

  function getEndpointName(endpointId: number): string {
    const endpoint = getEndpoint(endpointId);

    return endpoint?.hostname ?? `Endpoint #${endpointId}`;
  }

  return (
    <section
      aria-labelledby="alerts-heading"
      className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400">
            <AlertTriangle size={21} />
          </div>

          <div>
            <h3
              id="alerts-heading"
              className="font-semibold text-slate-100"
            >
              {showingHistory ? "Histórico de alertas" : "Alertas ativos"}
            </h3>

            <p className="text-sm text-slate-400">
              {showingHistory
                ? "Alertas já resolvidos, do mais recente ao mais antigo."
                : "Condições que exigem atenção nos endpoints."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasHistory && (
            <div
              role="tablist"
              aria-label="Tipo de alerta"
              className="flex rounded-lg border border-slate-700 p-0.5 text-xs"
            >
              <TabButton
                selected={!showingHistory}
                onClick={() => setActiveTab("active")}
              >
                <AlertTriangle size={13} />
                Ativos
              </TabButton>

              <TabButton
                selected={showingHistory}
                onClick={() => setActiveTab("history")}
              >
                <History size={13} />
                Histórico
              </TabButton>
            </div>
          )}

          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
            {visibleLoading
              ? "..."
              : showingHistory
                ? `${visibleAlerts.length} resolvido(s)`
                : `${alerts.length} ativo(s)`}
          </span>
        </div>
      </div>

      {visibleLoading && visibleAlerts.length === 0 ? (
        <StatusMessage>
          {showingHistory
            ? "Carregando histórico..."
            : "Carregando alertas..."}
        </StatusMessage>
      ) : visibleError ? (
        <StatusMessage error>
          {showingHistory
            ? "Não foi possível carregar o histórico de alertas."
            : "Não foi possível carregar os alertas."}
        </StatusMessage>
      ) : visibleAlerts.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-700 px-5 py-6">
          <CheckCircle2
            className="text-emerald-400"
            size={20}
          />

          <p className="text-sm text-slate-400">
            {showingHistory
              ? "Nenhum alerta resolvido até agora."
              : "Nenhum alerta ativo no momento."}
          </p>
        </div>
      ) : (
        <div className="max-h-[36rem] space-y-3 overflow-y-auto pr-1">
          {visibleAlerts.map((alert) => {
            const endpoint = getEndpoint(alert.endpointId);

            return (
              <article
                key={alert.id}
                className="rounded-xl border border-slate-700 bg-slate-950/40 p-4"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      {getMetricTypeLabel(alert.metricType)}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {getEndpointName(alert.endpointId)}
                    </p>
                  </div>

                  <span
                    aria-label={`Severidade: ${alert.severity}`}
                    className={`flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${getSeverityClass(
                      alert.severity,
                    )}`}
                  >
                    {getSeverityIcon(alert.severity)}
                    {alert.severity}
                  </span>
                </div>

                {endpoint && (
                  <div className="mt-3 grid gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs sm:grid-cols-2">
                    {endpoint.ipAddress && (
                      <div>
                        <span className="text-slate-500">
                          Endereço IP
                        </span>

                        <p className="mt-1 text-slate-300">
                          {endpoint.ipAddress}
                        </p>
                      </div>
                    )}

                    {endpoint.operatingSystem && (
                      <div>
                        <span className="text-slate-500">
                          Sistema operacional
                        </span>

                        <p className="mt-1 text-slate-300">
                          {endpoint.operatingSystem}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                  <span>
                    Limite: {getThresholdLabel(alert)}
                  </span>

                  <span>
                    Acionado em:{" "}
                    {new Date(
                      alert.triggeredAt,
                    ).toLocaleString("pt-BR")}
                  </span>

                  {alert.resolvedAt && (
                    <>
                      <span>
                        Resolvido em:{" "}
                        {new Date(
                          alert.resolvedAt,
                        ).toLocaleString("pt-BR")}
                      </span>

                      <span>
                        Duração:{" "}
                        {formatDuration(
                          alert.triggeredAt,
                          alert.resolvedAt,
                        )}
                      </span>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

interface StatusMessageProps {
  children: React.ReactNode;
  error?: boolean;
}

function StatusMessage({
  children,
  error = false,
}: StatusMessageProps) {
  return (
    <div
      className={`flex min-h-32 items-center justify-center rounded-xl border p-6 text-sm ${
        error
          ? "border-red-900/50 text-red-400"
          : "border-slate-800 text-slate-400"
      }`}
    >
      {children}
    </div>
  );
}

interface TabButtonProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ selected, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors ${
        selected
          ? "bg-slate-700 text-slate-100"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
