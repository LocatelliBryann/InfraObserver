import "dotenv/config";

import app from "./app";
import { offlineDetectionJob } from "./config/dependencies";
import { logger } from "./config/logger";

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  logger.info({ port: PORT }, "InfraObserver API started");

  // RF04: verificação periódica de endpoints inativos.
  offlineDetectionJob.start();
});