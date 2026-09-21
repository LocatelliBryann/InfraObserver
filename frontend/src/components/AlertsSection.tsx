import {
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import type { Alert } from "../services/alertsService";
import type { Endpoint } from "../services/endpointsService";

interface AlertsSectionProps {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  endpoints: Endpoint[];
}

export function AlertsSection({
  alerts,
  loading,
  error,
  endpoints,
}: AlertsSectionProps) {
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
              Alertas ativos
            </h3>

            <p className="text-sm text-slate-400">
              Condições que exigem atenção nos endpoints.
            </p>
          </div>
        </div>

        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
          {loading ? "..." : `${alerts.length} ativo(s)`}
        </span>
      </div>

      {loading ? (
        <StatusMessage>
          Carregando alertas...
        </StatusMessage>
      ) : error ? (
        <StatusMessage error>
          Não foi possível carregar os alertas.
        </StatusMessage>
      ) : alerts.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-700 px-5 py-6">
          <CheckCircle2
            className="text-emerald-400"
            size={20}
          />

          <p className="text-sm text-slate-400">
            Nenhum alerta ativo no momento.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const endpoint = getEndpoint(alert.endpointId);

            return (
              <article
                key={alert.id}
                className="rounded-xl border border-slate-700 bg-slate-950/40 p-4"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      {alert.metricType}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {getEndpointName(alert.endpointId)}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
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
                    Limite: {alert.thresholdValue}
                  </span>

                  <span>
                    Acionado em:{" "}
                    {new Date(
                      alert.triggeredAt,
                    ).toLocaleString("pt-BR")}
                  </span>
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