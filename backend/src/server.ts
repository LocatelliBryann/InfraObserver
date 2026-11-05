import "dotenv/config";

import app from "./app";
import { offlineDetectionJob } from "./config/dependencies";

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  console.log(`InfraObserver API running on port ${PORT}`);

  // RF04: verificação periódica de endpoints inativos.
  offlineDetectionJob.start();
});