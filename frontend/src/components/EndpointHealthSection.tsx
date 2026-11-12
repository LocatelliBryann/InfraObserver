import { useState } from "react";

import type { Metric } from "../services/metricsService";
import { EndpointResourceSummary } from "./EndpointResourceSummary";

const STATUS_BADGES: Record<
  string,
  { label: string; className: string }
> = {
  online: {
    label: "Operacional",
    className: "bg-emerald-500/10 text-emerald-400",
  },
  alert: {
    label: "Em alerta",
    className: "bg-amber-500/10 text-amber-400",
  },
  offline: {
    label: "Indisponível",
    className: "bg-rose-500/10 text-rose-400",
  },
};

function describeEndpoint(endpoint: {
  id: number;
  ipAddress?: string;
  osName?: string | null;
  osVersion?: string | null;
  agentVersion?: string | null;
  clientName?: string | null;
}): string[] {
  const system = [endpoint.osName, endpoint.osVersion].filter(Boolean).join(" ");

  return [
    `ID ${endpoint.id}`,
    endpoint.clientName ? `Cliente ${endpoint.clientName}` : undefined,
    endpoint.ipAddress,
    system,
    endpoint.agentVersion ? `Agente ${endpoint.agentVersion}` : undefined,
  ].filter((part): part is string => Boolean(part));
}

interface EndpointHealthSectionProps {
  endpoint: {
    id: number;
    hostname: string;
    status: string;
    activeAlerts?: number;
    ipAddress?: string;
    osName?: string | null;
    osVersion?: string | null;
    agentVersion?: string | null;
    clientName?: string | null;
    // Data em que o acesso do agente foi revogado no dashboard.
    revokedAt?: string | null;
  } | null;
  metric: Metric | null;
  // Sem esta função, o botão "Revogar acesso" não aparece.
  onRevoke?: (endpointId: number) => Promise<void>;
}

export function EndpointHealthSection({
  endpoint,
  metric,
  onRevoke,
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

  const badge =
    STATUS_BADGES[endpoint.status.toLowerCase()] ?? STATUS_BADGES.offline;
  const alertSuffix =
    endpoint.status.toLowerCase() === "alert" && endpoint.activeAlerts
      ? ` (${endpoint.activeAlerts})`
      : "";

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
            {describeEndpoint(endpoint).join(" · ")}
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span
            className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}
          >
            {badge.label}
            {alertSuffix}
          </span>

          {endpoint.revokedAt ? (
            <span className="inline-flex w-fit items-center rounded-full bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-400">
              Acesso revogado em {new Date(endpoint.revokedAt).toLocaleDateString("pt-BR")}
            </span>
          ) : (
            onRevoke && (
              <RevokeAccessButton
                key={endpoint.id}
                hostname={endpoint.hostname}
                onConfirm={() => onRevoke(endpoint.id)}
              />
            )
          )}
        </div>
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

interface RevokeAccessButtonProps {
  hostname: string;
  onConfirm: () => Promise<void>;
}

// Em dois passos, para não revogar um PC com um clique acidental.
function RevokeAccessButton({ hostname, onConfirm }: RevokeAccessButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    try {
      setBusy(true);
      setError(null);
      await onConfirm();
      setConfirming(false);
    } catch {
      setError("Não foi possível revogar o acesso.");
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 transition-colors hover:border-rose-500/60 hover:text-rose-400"
      >
        Revogar acesso
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <p className="text-xs text-slate-400">
        O agente de {hostname} para de enviar dados. O histórico continua.
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleConfirm()}
          className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
        >
          Confirmar revogação
        </button>

        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-600"
        >
          Cancelar
        </button>
      </div>

      {error && (
        <p role="alert" className="text-xs text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
