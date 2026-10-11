import "reflect-metadata";
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

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.DATABASE_URL,
  // En dev : synchronisation automatique du schéma pour démarrer vite.
  // En prod : migrations uniquement (synchronize désactivé).
  synchronize: !isProd,
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
  ],
  migrations: ["src/migrations/*.ts"],
});
