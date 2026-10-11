import "reflect-metadata";
import { createApp } from "./app.js";
import { AppDataSource } from "./db/data-source.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
  await AppDataSource.initialize();
  logger.info("Base de données connectée");

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`API à l'écoute sur http://localhost:${env.PORT}`);
  });

  const shutdown = (signal: string): void => {
    logger.info({ signal }, "Arrêt en cours");
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
