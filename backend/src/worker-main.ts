import "reflect-metadata";
import { createServer, type Server } from "node:http";
import { AppDataSource } from "./db/data-source.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { registry } from "./observability/metrics.js";
import { startWorker, stopWorker } from "./workers/worker.js";

/**
 * Petit serveur HTTP dédié aux sondes : le worker n'a pas d'API, mais Prometheus
 * doit pouvoir le scraper (/metrics) et les orchestrateurs le sonder (/healthz).
 */
function startMetricsServer(): Server {
  const server = createServer((req, res) => {
    if (req.url === "/healthz") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ live: true }));
      return;
    }
    if (req.url === "/metrics" && env.METRICS_ENABLED) {
      if (env.METRICS_TOKEN && req.headers.authorization !== `Bearer ${env.METRICS_TOKEN}`) {
        res.writeHead(401).end();
        return;
      }
      registry
        .metrics()
        .then((body) => {
          res.writeHead(200, { "content-type": registry.contentType });
          res.end(body);
        })
        .catch(() => res.writeHead(500).end());
      return;
    }
    res.writeHead(404).end();
  });
  server.listen(env.WORKER_METRICS_PORT, () => {
    logger.info({ port: env.WORKER_METRICS_PORT }, "Worker : endpoint /metrics exposé");
  });
  return server;
}

/**
 * Attend que le schéma soit prêt (table `jobs` présente). Les migrations sont
 * jouées par l'API (RUN_MIGRATIONS=false ici) : on patiente le temps qu'elles
 * s'appliquent, plutôt que de migrer en concurrence.
 */
async function waitForSchema(maxMs = 60_000): Promise<void> {
  const start = Date.now();
  for (;;) {
    const [{ ready }] = (await AppDataSource.query(
      `SELECT to_regclass('public.jobs') IS NOT NULL AS ready`,
    )) as Array<{ ready: boolean }>;
    if (ready) return;
    if (Date.now() - start > maxMs) {
      throw new Error("Schéma indisponible : la table 'jobs' n'existe pas (migrations API non jouées ?)");
    }
    logger.info("Worker : en attente du schéma (migrations)…");
    await new Promise((r) => setTimeout(r, 1000));
  }
}

/**
 * Point d'entrée du worker dédié (sans serveur HTTP).
 * En prod on peut lancer N instances de ce process (docker compose --scale
 * worker=N) et mettre WORKER_ENABLED=false sur l'API : la file est partagée en
 * base et `FOR UPDATE SKIP LOCKED` garantit qu'un job n'est pris qu'une fois.
 */
async function main(): Promise<void> {
  await AppDataSource.initialize();
  logger.info("Worker : base de données connectée");

  const metricsServer = env.METRICS_ENABLED ? startMetricsServer() : null;

  await waitForSchema();
  startWorker();

  const shutdown = (signal: string): void => {
    logger.info({ signal }, "Arrêt du worker en cours");
    stopWorker();
    metricsServer?.close();
    void AppDataSource.destroy().then(() => process.exit(0));
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error({ err }, "Échec du démarrage du worker");
  process.exit(1);
});
