import cors from "cors";
import express from "express";
import helmet from "helmet";

import alertRouter from "./routes/alert.routes";
import endpointRouter from "./routes/endpoint.routes";
import fileEventRouter from "./routes/file-event.routes";
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
app.use("/api/v1/file-events", fileEventRouter);
app.use("/api/v1/alerts", alertRouter);

export default app;