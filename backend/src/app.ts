import "express-async-errors";
import express, { type Express } from "express";
import { pinoHttp } from "pino-http";
import { logger } from "./utils/logger.js";
import { applySecurity, globalRateLimiter } from "./security/index.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";
import { metricsRouter } from "./routes/metrics.js";
import { metricsMiddleware } from "./observability/metrics.js";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { projectsRouter } from "./routes/projects.js";
import { signalsRouter } from "./routes/signals.js";
import { anomaliesRouter } from "./routes/anomalies.js";
import { decisionsRouter } from "./routes/decisions.js";
import { reportsRouter } from "./routes/reports.js";
import { jobsRouter } from "./routes/jobs.js";
import { notificationsRouter } from "./routes/notifications.js";
import { mcpRouter } from "./routes/mcp.js";
import { briefingRouter } from "./routes/briefing.js";
import { forecastRouter } from "./routes/forecast.js";
import { gdprRouter } from "./routes/gdpr.js";
import { resourcesRouter } from "./routes/resources.js";
import { planningRouter } from "./routes/planning.js";
import { risksRouter } from "./routes/risks.js";
import { connectorsRouter } from "./routes/connectors.js";
import { documentsRouter } from "./routes/documents.js";

export function createApp(): Express {
  const app = express();

  applySecurity(app);
  app.use(pinoHttp({ logger }));

  // Import de documents : monté avant le parser JSON global (limite 1 Mo) afin
  // d'autoriser des fichiers plus volumineux sur cette seule route, sans élargir
  // la limite des autres endpoints. Le routeur applique son propre parser 8 Mo.
  app.use("/api/v1", globalRateLimiter, documentsRouter);

  app.use(express.json({ limit: "1mb" }));

  // Instrumentation Prometheus de toutes les requêtes.
  if (env.METRICS_ENABLED) app.use(metricsMiddleware);

  // Santé et métriques hors rate limiting (sondes & scrape Prometheus).
  app.use(healthRouter);
  app.use(metricsRouter);

  // API versionnée et limitée en débit.
  const api = express.Router();
  api.use(globalRateLimiter);
  api.use(authRouter);
  api.use(projectsRouter);
  api.use(signalsRouter);
  api.use(anomaliesRouter);
  api.use(decisionsRouter);
  api.use(reportsRouter);
  api.use(jobsRouter);
  api.use(notificationsRouter);
  api.use(mcpRouter);
  api.use(briefingRouter);
  api.use(forecastRouter);
  api.use(gdprRouter);
  api.use(resourcesRouter);
  api.use(planningRouter);
  api.use(risksRouter);
  api.use(connectorsRouter);
  app.use("/api/v1", api);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
