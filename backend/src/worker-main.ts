import "reflect-metadata";
import { AppDataSource } from "./db/data-source.js";
import { logger } from "./utils/logger.js";
import { startWorker, stopWorker } from "./workers/worker.js";

/**
 * Point d'entrée du worker dédié (sans serveur HTTP).
 * En prod on peut lancer N instances de ce process (docker compose --scale
 * worker=N) et mettre WORKER_ENABLED=false sur l'API : la file est partagée en
 * base et `FOR UPDATE SKIP LOCKED` garantit qu'un job n'est pris qu'une fois.
 */
async function main(): Promise<void> {
  await AppDataSource.initialize();
  logger.info("Worker : base de données connectée");

  startWorker();

  const shutdown = (signal: string): void => {
    logger.info({ signal }, "Arrêt du worker en cours");
    stopWorker();
    void AppDataSource.destroy().then(() => process.exit(0));
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error({ err }, "Échec du démarrage du worker");
  process.exit(1);
});
