import type { NextFunction, Request, Response } from "express";

import { httpMetrics, type HttpMetrics } from "../observability/metrics";

// Usa o padrão da rota (/api/v1/alerts/:id) e não a URL real (/api/v1/alerts/42),
// para não criar uma série nova no Prometheus a cada id diferente.
export function resolveRouteLabel(req: Request): string {
  const routePath: unknown = req.route?.path;

  if (typeof routePath !== "string") {
    return "unmatched";
  }

  const fullPath = `${req.baseUrl}${routePath}`;

  return fullPath.length > 1 ? fullPath.replace(/\/$/, "") : fullPath;
}

export function createHttpMetricsMiddleware(metrics: HttpMetrics = httpMetrics) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const stopTimer = metrics.duration.startTimer();

    res.on("finish", () => {
      const labels = {
        method: req.method,
        route: resolveRouteLabel(req),
        status_code: String(res.statusCode),
      };

      stopTimer(labels);
      metrics.requests.inc(labels);
    });

    next();
  };
}
