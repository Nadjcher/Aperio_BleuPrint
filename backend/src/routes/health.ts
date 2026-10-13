import { Router } from "express";
import { AppDataSource } from "../db/data-source.js";

export const healthRouter = Router();

async function dbUp(): Promise<boolean> {
  try {
    await AppDataSource.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

/**
 * Santé globale : 200 si la base répond, 503 sinon. Le code HTTP (et pas
 * seulement le corps) permet aux sondes des load-balancers / Prometheus
 * blackbox de détecter une dégradation.
 */
healthRouter.get("/health", async (_req, res) => {
  const up = await dbUp();
  res
    .status(up ? 200 : 503)
    .json({ status: up ? "ok" : "degraded", db: up ? "up" : "down", time: new Date().toISOString() });
});

/** Readiness : le service peut-il traiter du trafic (base joignable) ? */
healthRouter.get("/ready", async (_req, res) => {
  const up = await dbUp();
  res.status(up ? 200 : 503).json({ ready: up });
});

/** Liveness : le process répond (pas de dépendance externe). */
healthRouter.get("/live", (_req, res) => {
  res.json({ live: true });
});
