import cors from "cors";
import express from "express";
import helmet from "helmet";

import alertRouter from "./routes/alert.routes";
import endpointRouter from "./routes/endpoint.routes";
import fileEventRouter from "./routes/file-event.routes";
import metricRouter from "./routes/metric.routes";
import endpointHealthRouter from "./routes/endpoint-health.routes";
import { prometheusController } from "./config/dependencies";
import { createHttpMetricsMiddleware } from "./middlewares/http-metrics.middleware";
import { requestLogger } from "./middlewares/request-logger.middleware";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use(createHttpMetricsMiddleware());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

// Lido pelo Prometheus pela rede interna do Docker (o Caddy não publica esta rota).
app.get("/metrics", (req, res) => prometheusController.metrics(req, res));

app.use("/api/v1/endpoints", endpointRouter);
app.use("/api/v1/endpoints/health", endpointHealthRouter);
app.use("/api/v1/metrics", metricRouter);
app.use("/api/v1/file-events", fileEventRouter);
app.use("/api/v1/alerts", alertRouter);

app.use((_req, res) => {
  res.status(404).json({
    error: "Rota não encontrada",
  });
});

export default app;