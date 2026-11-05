
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

function normalizeValue(value: number | null): number {
  if (value === null || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function formatPercentage(
  used: number | null,
  total: number | null,
): number {
  if (
    used === null ||
    total === null ||
    !Number.isFinite(used) ||
    !Number.isFinite(total) ||
    total <= 0
  ) {
    return 0;
  }

  return normalizeValue(Number(((used / total) * 100).toFixed(2)));
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Horário inválido";
  }

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isValidMetric(metric: Metric): boolean {
  return !Number.isNaN(new Date(metric.collectedAt).getTime());
}

function createChartData(metrics: Metric[]): ChartData[] {
  return [...metrics]
    .filter(isValidMetric)
    .reverse()
    .map((metric) => ({
      timestamp: formatTimestamp(metric.collectedAt),
      cpu: normalizeValue(metric.cpuPercent),
      memory: formatPercentage(
        metric.memoryUsed,
        metric.memoryTotal,
      ),
      disk: formatPercentage(
        metric.diskUsed,
        metric.diskTotal,
      ),
    }));
}

export function MetricsChart({ metrics }: MetricsChartProps) {
  const chartData = createChartData(metrics);

  if (chartData.length === 0) {
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
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={0}
        >
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="timestamp" />

            <YAxis
              domain={[0, 100]}
              unit="%"
              allowDataOverflow={false}
            />

            <Tooltip />

            <Legend />

            <Line
              type="monotone"
              dataKey="cpu"
              name="CPU"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />

            <Line
              type="monotone"
              dataKey="memory"
              name="Memória"
              stroke="#16a34a"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />

            <Line
              type="monotone"
              dataKey="disk"
              name="Disco"
              stroke="#ea580c"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}