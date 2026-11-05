export type MetricPeriodKey = "live" | "1h" | "6h" | "24h";

interface MetricPeriodConfig {
  label: string;
  durationMs: number | null;
  limit: number;
}

// RF18 / UC06: períodos disponíveis para o histórico de métricas.
export const METRIC_PERIODS: Record<MetricPeriodKey, MetricPeriodConfig> = {
  live: {
    label: "Tempo real",
    durationMs: null,
    limit: 20,
  },
  "1h": {
    label: "1 hora",
    durationMs: 60 * 60 * 1000,
    limit: 120,
  },
  "6h": {
    label: "6 horas",
    durationMs: 6 * 60 * 60 * 1000,
    limit: 720,
  },
  "24h": {
    label: "24 horas",
    durationMs: 24 * 60 * 60 * 1000,
    limit: 1500,
  },
};

export const METRIC_PERIOD_KEYS = Object.keys(
  METRIC_PERIODS,
) as MetricPeriodKey[];
