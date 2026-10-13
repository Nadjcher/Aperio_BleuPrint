import { Router } from "express";
import { env } from "../config/env.js";
import { registry } from "../observability/metrics.js";

/** Endpoint Prometheus. Optionnellement protégé par un jeton (METRICS_TOKEN). */
export const metricsRouter = Router();

metricsRouter.get("/metrics", async (req, res) => {
  if (!env.METRICS_ENABLED) {
    res.status(404).end();
    return;
  }
  if (env.METRICS_TOKEN && req.headers.authorization !== `Bearer ${env.METRICS_TOKEN}`) {
    res.status(401).end();
    return;
  }
  res.set("Content-Type", registry.contentType);
  res.end(await registry.metrics());
});
