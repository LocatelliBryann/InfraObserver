// RN06 / RF23: métricas, eventos de arquivo e alertas ficam 60 dias no banco.
export const DEFAULT_RETENTION_DAYS = 60;

// A limpeza roda na partida da API e depois uma vez por dia.
export const RETENTION_RUN_INTERVAL_MS = 24 * 60 * 60 * 1000;

const MAX_RETENTION_DAYS = 3650;

/**
 * Lê DATA_RETENTION_DAYS. Vazio usa o padrão (60); 0 desliga a limpeza.
 */
export function getRetentionDays(): number {
  const rawValue = process.env.DATA_RETENTION_DAYS;

  if (rawValue === undefined || rawValue.trim() === "") {
    return DEFAULT_RETENTION_DAYS;
  }

  const value = Number(rawValue);

  if (!Number.isInteger(value) || value < 0 || value > MAX_RETENTION_DAYS) {
    throw new Error(
      `DATA_RETENTION_DAYS must be an integer between 0 and ${MAX_RETENTION_DAYS}`,
    );
  }

  return value;
}
