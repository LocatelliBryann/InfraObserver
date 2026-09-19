
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

function formatBytes(value: number | null): string {
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

function formatPercentage(
  used: number | null,
  total: number | null,
): string {
  if (used === null || total === null || total <= 0) {
    return "Sem dados";
  }

  return `${((used / total) * 100).toFixed(1)}%`;
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

  const resources = [
    {
      label: "Processador",
      value:
        metric.cpuPercent === null
          ? "Sem dados"
          : `${metric.cpuPercent.toFixed(1)}%`,
      icon: <Cpu size={18} />,
    },
    {
      label: "Memória",
      value: formatPercentage(metric.memoryUsed, metric.memoryTotal),
      icon: <Activity size={18} />,
    },
    {
      label: "Armazenamento",
      value: formatPercentage(metric.diskUsed, metric.diskTotal),
      icon: <HardDrive size={18} />,
    },
    {
      label: "Rede enviada",
      value: formatNetworkValue(metric.netBytesSent),
      icon: <Network size={18} />,
    },
    {
      label: "Rede recebida",
      value: formatNetworkValue(metric.netBytesRecv),
      icon: <Network size={18} />,
    },
  ];

  return (
    <div className="space-y-5">
      {resources.map((resource) => (
        <div
          key={resource.label}
          className="flex items-center justify-between border-b border-slate-800 pb-4 last:border-b-0 last:pb-0"
        >
          <div className="flex items-center gap-3 text-slate-300">
            <span className="text-slate-500" aria-hidden="true">
              {resource.icon}
            </span>

            <span className="text-sm">{resource.label}</span>
          </div>

          <span className="text-xs text-slate-300">
            {resource.value}
          </span>
        </div>
      ))}
    </div>
  );
}