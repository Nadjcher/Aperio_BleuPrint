import "reflect-metadata";
import { createApp } from "./app.js";
import { AppDataSource } from "./db/data-source.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { startWorker, stopWorker } from "./workers/worker.js";
import { startMaintenance, stopMaintenance } from "./services/maintenanceService.js";

async function main(): Promise<void> {
  await AppDataSource.initialize();
  logger.info("Base de données connectée");

  // Worker asynchrone (dépile les jobs : sync de projets, etc.)
  startWorker();
  // Purge RGPD : seulement si c'est ce process qui porte le worker in-process
  // (sinon c'est le worker dédié qui s'en charge — jamais les deux).
  if (env.WORKER_ENABLED) startMaintenance();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`API à l'écoute sur http://localhost:${env.PORT}`);
  });

  const shutdown = (signal: string): void => {
    logger.info({ signal }, "Arrêt en cours");
    stopWorker();
    stopMaintenance();
    server.close(() => {
      void AppDataSource.destroy().then(() => process.exit(0));
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error({ err }, "Échec du démarrage");
  process.exit(1);
});
