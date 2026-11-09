import type { ReactNode } from "react";

import {
  Activity,
  Cpu,
  HardDrive,
  Network,
} from "lucide-react";

import type { Metric } from "../services/metricsService";

interface EndpointResourceSummaryProps {
  metric: Metric | null;
}

type UsageLevel = "ok" | "warning" | "critical";

// Mesmos limites dos alertas do backend (metric.service.ts): a barra fica
// amarela um pouco antes, para mostrar quem está chegando perto de alertar.
export const USAGE_THRESHOLDS = {
  cpu: { warning: 70, critical: 80 },
  memory: { warning: 70, critical: 80 },
  disk: { warning: 80, critical: 90 },
} as const;

const LEVEL_STYLES: Record<UsageLevel, string> = {
  ok: "bg-emerald-500",
  warning: "bg-amber-400",
  critical: "bg-rose-500",
};

export function formatBytes(value: number | null): string {
  if (value === null) {
    return "Sem dados";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function toPercent(used: number | null, total: number | null): number | null {
  if (used === null || total === null || total <= 0) {
    return null;
  }

  return (used / total) * 100;
}

export function usageLevel(
  percent: number,
  thresholds: { warning: number; critical: number },
): UsageLevel {
  if (percent > thresholds.critical) {
    return "critical";
  }

  return percent > thresholds.warning ? "warning" : "ok";
}

function formatNetworkValue(value: string | null): string {
  if (value === null) {
    return "Sem dados";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "Sem dados";
  }

  return formatBytes(numericValue);
}

interface UsageBarProps {
  label: string;
  icon: ReactNode;
  percent: number | null;
  thresholds: { warning: number; critical: number };
  detail?: string;
}

function UsageBar({ label, icon, percent, thresholds, detail }: UsageBarProps) {
  const level = percent === null ? null : usageLevel(percent, thresholds);
  const clamped = percent === null ? 0 : Math.min(Math.max(percent, 0), 100);

  return (
    <div className="border-b border-slate-800 pb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-slate-300">
          <span className="text-slate-500" aria-hidden="true">
            {icon}
          </span>

          <span className="text-sm">{label}</span>
        </div>

        <span className="text-right text-xs text-slate-300">
          {percent === null ? "Sem dados" : `${percent.toFixed(1)}%`}
          {detail && (
            <span className="text-slate-500"> · {detail}</span>
          )}
        </span>
      </div>

      {level !== null && (
        <div
          role="progressbar"
          aria-label={`${label} em uso`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(clamped)}
          data-level={level}
          className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-800"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${LEVEL_STYLES[level]}`}
            style={{ width: `${clamped}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function EndpointResourceSummary({
  metric,
}: EndpointResourceSummaryProps) {
  if (!metric) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-5 text-center">
        <p className="text-sm font-medium text-slate-300">
          Nenhuma métrica disponível
        </p>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          O endpoint ainda não enviou dados de monitoramento.
        </p>
      </div>
    );
  }

  const network = [
    { label: "Rede enviada", value: formatNetworkValue(metric.netBytesSent) },
    { label: "Rede recebida", value: formatNetworkValue(metric.netBytesRecv) },
  ];

  const diskDetail =
    metric.diskUsed !== null && metric.diskTotal !== null && metric.diskTotal > 0
      ? `${formatBytes(metric.diskUsed)} de ${formatBytes(metric.diskTotal)}`
      : undefined;

  return (
    <div className="space-y-4">
      <UsageBar
        label="Processador"
        icon={<Cpu size={18} />}
        percent={metric.cpuPercent}
        thresholds={USAGE_THRESHOLDS.cpu}
      />

      <UsageBar
        label="Memória"
        icon={<Activity size={18} />}
        percent={toPercent(metric.memoryUsed, metric.memoryTotal)}
        thresholds={USAGE_THRESHOLDS.memory}
      />

      <UsageBar
        label="Armazenamento"
        icon={<HardDrive size={18} />}
        percent={toPercent(metric.diskUsed, metric.diskTotal)}
        thresholds={USAGE_THRESHOLDS.disk}
        detail={diskDetail}
      />

      {network.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between border-b border-slate-800 pb-4 last:border-b-0 last:pb-0"
        >
          <div className="flex items-center gap-3 text-slate-300">
            <span className="text-slate-500" aria-hidden="true">
              <Network size={18} />
            </span>

            <span className="text-sm">{item.label}</span>
          </div>

          <span className="text-xs text-slate-300">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
