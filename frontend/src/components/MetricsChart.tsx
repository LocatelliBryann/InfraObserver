
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

const CHART_COLORS = {
  grid: "#1b2b43",
  axis: "#8195b3",
  tooltipBackground: "rgba(7, 17, 30, 0.92)",
  tooltipBorder: "#2b3d58",
  tooltipText: "#e4ecf7",
  cpu: "#42dcc8",
  memory: "#6aa8ff",
  disk: "#f5b342",
};

// Brilho suave em volta das linhas do gráfico.
const GLOW_FILTER_ID = "io-chart-glow";

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
      <div className="flex min-h-64 items-center justify-center io-card rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
        Nenhuma métrica disponível.
      </div>
    );
  }

  return (
    <div
      data-testid="metrics-chart"
      className="io-card rounded-2xl border border-slate-800 bg-slate-900 p-4"
    >
      <h2 className="mb-4 text-base font-semibold text-slate-100">
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
            <defs>
              <filter
                id={GLOW_FILTER_ID}
                x="-10%"
                y="-50%"
                width="120%"
                height="200%"
              >
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid
              strokeDasharray="3 6"
              stroke={CHART_COLORS.grid}
              vertical={false}
            />

            <XAxis
              dataKey="timestamp"
              stroke={CHART_COLORS.axis}
              tick={{ fill: CHART_COLORS.axis }}
            />

            <YAxis
              domain={[0, 100]}
              unit="%"
              allowDataOverflow={false}
              stroke={CHART_COLORS.axis}
              tick={{ fill: CHART_COLORS.axis }}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: CHART_COLORS.tooltipBackground,
                borderColor: CHART_COLORS.tooltipBorder,
                borderRadius: 12,
                color: CHART_COLORS.tooltipText,
                backdropFilter: "blur(8px)",
              }}
              cursor={{ stroke: CHART_COLORS.cpu, strokeOpacity: 0.35 }}
              labelStyle={{ color: CHART_COLORS.tooltipText }}
            />

            <Legend wrapperStyle={{ color: CHART_COLORS.axis }} />

            <Line
              type="monotone"
              dataKey="cpu"
              name="CPU"
              stroke={CHART_COLORS.cpu}
              strokeWidth={2.25}
              filter={`url(#${GLOW_FILTER_ID})`}
              dot={false}
              isAnimationActive={false}
            />

            <Line
              type="monotone"
              dataKey="memory"
              name="Memória"
              stroke={CHART_COLORS.memory}
              strokeWidth={2.25}
              filter={`url(#${GLOW_FILTER_ID})`}
              dot={false}
              isAnimationActive={false}
            />

            <Line
              type="monotone"
              dataKey="disk"
              name="Disco"
              stroke={CHART_COLORS.disk}
              strokeWidth={2.25}
              filter={`url(#${GLOW_FILTER_ID})`}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}