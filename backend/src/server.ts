import "dotenv/config";

import app from "./app";
import { assertAuthConfiguration } from "./config/auth";
import { offlineDetectionJob, retentionJob } from "./config/dependencies";
import { logger } from "./config/logger";

const PORT = Number(process.env.PORT ?? 3000);

assertAuthConfiguration();

app.listen(PORT, () => {
  logger.info({ port: PORT }, "InfraObserver API started");

  // RF04: verificação periódica de endpoints inativos.
  offlineDetectionJob.start();

  // RF23: remove métricas, eventos e alertas mais antigos que a retenção.
  retentionJob.start();
});