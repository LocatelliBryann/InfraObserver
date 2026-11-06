import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { getAllowedOrigins } from "./config/auth";
import alertRouter from "./routes/alert.routes";
import authRouter from "./routes/auth.routes";
import endpointRouter from "./routes/endpoint.routes";
import fileEventRouter from "./routes/file-event.routes";
import metricRouter from "./routes/metric.routes";
import endpointHealthRouter from "./routes/endpoint-health.routes";
import { prometheusController } from "./config/dependencies";
import { createHttpMetricsMiddleware } from "./middlewares/http-metrics.middleware";
import { requestLogger } from "./middlewares/request-logger.middleware";

const app = express();

// Atrás do Caddy: usa o IP real do cliente (X-Forwarded-For) no limite de login.
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

app.use(helmet());
// Só as origens liberadas podem chamar a API com o cookie de sessão.
app.use(cors({ origin: getAllowedOrigins(), credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);
app.use(createHttpMetricsMiddleware());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

// Lido pelo Prometheus pela rede interna do Docker (o Caddy não publica esta rota).
app.get("/metrics", (req, res) => prometheusController.metrics(req, res));

app.use("/api/v1/auth", authRouter);
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