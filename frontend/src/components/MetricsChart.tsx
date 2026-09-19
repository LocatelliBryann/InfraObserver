
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Metric } from "../services/metricsService";

interface MetricsChartProps {
  metrics: Metric[];
}

interface ChartData {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
}

function formatPercentage(
  used: number | null,
  total: number | null,
): number {
  if (used === null || total === null || total <= 0) {
    return 0;
  }

  return Number(((used / total) * 100).toFixed(2));
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MetricsChart({
  metrics,
}: MetricsChartProps) {
  const chartData: ChartData[] = [...metrics]
    .reverse()
    .map((metric) => ({
      timestamp: formatTimestamp(metric.collectedAt),
      cpu: metric.cpuPercent ?? 0,
      memory: formatPercentage(
        metric.memoryUsed,
        metric.memoryTotal,
      ),
      disk: formatPercentage(
        metric.diskUsed,
        metric.diskTotal,
      ),
    }));

  if (metrics.length === 0) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-lg border border-slate-200 bg-white p-6 text-slate-500">
        Nenhuma métrica disponível.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">
        Histórico de métricas
      </h2>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis domain={[0, 100]} unit="%" />
            <Tooltip />
            <Legend />

            <Line
              type="monotone"
              dataKey="cpu"
              name="CPU"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="memory"
              name="Memória"
              stroke="#16a34a"
              strokeWidth={2}
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="disk"
              name="Disco"
              stroke="#ea580c"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}