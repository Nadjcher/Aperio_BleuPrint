import client from "prom-client";
import type { NextFunction, Request, Response } from "express";
import { AppDataSource } from "../db/data-source.js";
import { Job } from "../entities/Job.js";

/**
 * Registre Prometheus de l'application. Les métriques par défaut de Node
 * (CPU, mémoire, event-loop lag, GC) sont collectées automatiquement ; on y
 * ajoute des métriques HTTP et métier (file de jobs). Même module importé par
 * l'API et le worker : chaque process remplit ce qui le concerne.
 */
export const registry = new client.Registry();
registry.setDefaultLabels({ service: "aperio" });
client.collectDefaultMetrics({ register: registry });

// ─── HTTP (rempli par l'API) ────────────────────────────────────────────────
export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Durée des requêtes HTTP en secondes",
  labelNames: ["method", "route", "status"] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Nombre total de requêtes HTTP",
  labelNames: ["method", "route", "status"] as const,
  registers: [registry],
});

// ─── Jobs (rempli par le worker) ─────────────────────────────────────────────
/** outcome : done | retry | failed */
export const jobsProcessedTotal = new client.Counter({
  name: "jobs_processed_total",
  help: "Jobs traités par le worker, par type et issue",
  labelNames: ["type", "outcome"] as const,
  registers: [registry],
});

export const jobProcessingDuration = new client.Histogram({
  name: "job_processing_duration_seconds",
  help: "Durée de traitement d'un job en secondes",
  labelNames: ["type", "outcome"] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
  registers: [registry],
});

/**
 * Taille de la file par statut. Mesurée à chaque scrape (collect) plutôt que
 * via un timer : toujours fraîche, et si la base est indisponible on n'échoue
 * pas le scrape (le reste des métriques reste exposé).
 */
const JOB_STATUSES = ["pending", "running", "done", "failed"] as const;
export const jobsByStatus = new client.Gauge({
  name: "jobs_by_status",
  help: "Nombre de jobs par statut",
  labelNames: ["status"] as const,
  registers: [registry],
  async collect() {
    if (!AppDataSource.isInitialized) return;
    try {
      const rows: Array<{ status: string; count: string }> = await AppDataSource
        .getRepository(Job)
        .createQueryBuilder("j")
        .select("j.status", "status")
        .addSelect("COUNT(*)", "count")
        .groupBy("j.status")
        .getRawMany();
      const counts = new Map(rows.map((r) => [r.status, Number(r.count)]));
      for (const status of JOB_STATUSES) {
        this.set({ status }, counts.get(status) ?? 0);
      }
    } catch {
      // Base indisponible : on laisse les dernières valeurs connues.
    }
  },
});

/** Normalise la route pour éviter une cardinalité explosive (ids dans l'URL). */
function routeLabel(req: Request): string {
  // req.route n'est posé que pour une route matchée ; sinon on agrège.
  const path = (req.route as { path?: string } | undefined)?.path;
  if (path) return `${req.baseUrl}${path}` || path;
  return req.path === "/metrics" || req.path === "/health" || req.path === "/ready"
    ? req.path
    : "unmatched";
}

/** Middleware Express : chronomètre chaque requête et compte les statuts. */
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const stop = httpRequestDuration.startTimer();
  res.on("finish", () => {
    const labels = {
      method: req.method,
      route: routeLabel(req),
      status: String(res.statusCode),
    };
    stop(labels);
    httpRequestsTotal.inc(labels);
  });
  next();
}
