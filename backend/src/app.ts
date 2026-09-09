import cors from "cors";
import express from "express";
import helmet from "helmet";

import endpointRouter from "./routes/endpoint.routes";
import metricRouter from "./routes/metric.routes";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.use("/api/v1/endpoints", endpointRouter);
app.use("/api/v1/metrics", metricRouter);

export default app;