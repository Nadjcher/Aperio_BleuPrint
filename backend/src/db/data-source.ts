import "reflect-metadata";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DataSource } from "typeorm";
import { env, isProd } from "../config/env.js";
import { User } from "../entities/User.js";
import { RefreshToken } from "../entities/RefreshToken.js";
import { Project } from "../entities/Project.js";
import { Signal } from "../entities/Signal.js";
import { Anomaly } from "../entities/Anomaly.js";
import { Decision } from "../entities/Decision.js";
import { DecisionFeedback } from "../entities/DecisionFeedback.js";
import { AuditLog } from "../entities/AuditLog.js";
import { Report } from "../entities/Report.js";
import { Job } from "../entities/Job.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.DATABASE_URL,
  // En dev : synchronisation automatique du schéma pour démarrer vite.
  // En prod : migrations uniquement (synchronize désactivé, migrations jouées au boot).
  synchronize: !isProd,
  // Un seul process applique les migrations (RUN_MIGRATIONS=true, défaut) ;
  // les workers dédiés démarrent avec RUN_MIGRATIONS=false et attendent le schéma.
  migrationsRun: isProd && env.RUN_MIGRATIONS,
  logging: false,
  entities: [
    User,
    RefreshToken,
    Project,
    Signal,
    Anomaly,
    Decision,
    DecisionFeedback,
    AuditLog,
    Report,
    Job,
  ],
  // Chemin résolu depuis ce module (et non le cwd) : robuste quel que soit le
  // répertoire de lancement. En prod → dist/migrations/*.js, en dev → *.ts.
  migrations: [
    join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "migrations",
      isProd ? "*.js" : "*.ts",
    ),
  ],
});
