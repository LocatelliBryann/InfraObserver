import { z } from "zod";

const optionalEndpointId = z.coerce.number().int().positive().optional();
const optionalDate = z.coerce.date().optional();

interface PeriodQuery {
  from?: Date;
  to?: Date;
}

function isValidPeriod({ from, to }: PeriodQuery): boolean {
  return !from || !to || from.getTime() <= to.getTime();
}

const invalidPeriod = {
  message: "from must be before or equal to to",
  path: ["from"],
};

// RF08 / RF18: histórico de métricas de um endpoint, opcionalmente por período.
export const metricHistoryQuerySchema = z
  .object({
    endpointId: z.coerce.number().int().positive(),
    from: optionalDate,
    to: optionalDate,
    limit: z.coerce.number().int().positive().max(1500).default(20),
  })
  .refine(isValidPeriod, invalidPeriod);

// RF09 / RF20: eventos de arquivo, opcionalmente por endpoint e período.
export const fileEventQuerySchema = z
  .object({
    endpointId: optionalEndpointId,
    from: optionalDate,
    to: optionalDate,
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .refine(isValidPeriod, invalidPeriod);

export const ALERT_STATUS_FILTERS = ["active", "resolved", "all"] as const;

export type AlertStatusFilter = (typeof ALERT_STATUS_FILTERS)[number];

// RF12: alertas ativos (padrão), resolvidos ou todos.
export const alertQuerySchema = z.object({
  status: z.enum(ALERT_STATUS_FILTERS).default("active"),
  endpointId: optionalEndpointId,
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export type MetricHistoryQuery = z.infer<typeof metricHistoryQuerySchema>;
export type FileEventQuery = z.infer<typeof fileEventQuerySchema>;
export type AlertQuery = z.infer<typeof alertQuerySchema>;
