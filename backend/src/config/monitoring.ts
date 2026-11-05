const DEFAULT_COLLECTION_INTERVAL_SECONDS = 60;
const DEFAULT_OFFLINE_CHECK_INTERVAL_SECONDS = 60;

// RN02: endpoint é considerado offline após 3 ciclos de coleta sem dados.
export const OFFLINE_MISSED_CYCLES = 3;

function readPositiveInteger(
  variableName: string,
  defaultValue: number,
): number {
  const rawValue = process.env[variableName];

  if (rawValue === undefined || rawValue.trim() === "") {
    return defaultValue;
  }

  const value = Number(rawValue);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${variableName} must be a positive integer`);
  }

  return value;
}

export function getCollectionIntervalMs(): number {
  return (
    readPositiveInteger(
      "AGENT_COLLECTION_INTERVAL_SECONDS",
      DEFAULT_COLLECTION_INTERVAL_SECONDS,
    ) * 1000
  );
}

export function getOfflineThresholdMs(): number {
  return getCollectionIntervalMs() * OFFLINE_MISSED_CYCLES;
}

export function getOfflineCheckIntervalMs(): number {
  return (
    readPositiveInteger(
      "OFFLINE_CHECK_INTERVAL_SECONDS",
      DEFAULT_OFFLINE_CHECK_INTERVAL_SECONDS,
    ) * 1000
  );
}
