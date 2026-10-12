import "express-async-errors";
import express, { type Express } from "express";
import { pinoHttp } from "pino-http";
import { logger } from "./utils/logger.js";
import { applySecurity, globalRateLimiter } from "./security/index.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { projectsRouter } from "./routes/projects.js";
import { signalsRouter } from "./routes/signals.js";
import { anomaliesRouter } from "./routes/anomalies.js";
import { decisionsRouter } from "./routes/decisions.js";
import { reportsRouter } from "./routes/reports.js";
import { jobsRouter } from "./routes/jobs.js";
import { gdprRouter } from "./routes/gdpr.js";

export function createApp(): Express {
  const app = express();

  applySecurity(app);
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: "1mb" }));

  // Santé hors rate limiting pour les sondes.
  app.use(healthRouter);

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
  api.use(gdprRouter);
  app.use("/api/v1", api);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
