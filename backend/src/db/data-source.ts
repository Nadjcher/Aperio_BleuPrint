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
import { OneTimeToken } from "../entities/OneTimeToken.js";
import { McpCall } from "../entities/McpCall.js";
import { Member } from "../entities/Member.js";
import { Assignment } from "../entities/Assignment.js";
import { Milestone } from "../entities/Milestone.js";
import { Task } from "../entities/Task.js";
import { Risk } from "../entities/Risk.js";
import { ConnectorConfig } from "../entities/ConnectorConfig.js";
import { NotificationSetting } from "../entities/NotificationSetting.js";
import { Minutes } from "../entities/Minutes.js";
import { Block } from "../entities/Block.js";
import { BlockLink } from "../entities/BlockLink.js";
import { UserDigestPreference } from "../entities/UserDigestPreference.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.DATABASE_URL,
  // SSL pour les bases managées (Neon/Supabase/…). rejectUnauthorized:false
  // suffit : la connexion est chiffrée, le CA du fournisseur n'est pas épinglé.
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
  // Pool de connexions (driver pg). Taille configurable pour tenir les rafales
  // de requêtes analytiques sans saturer la limite du fournisseur.
  extra: { max: env.DB_POOL_MAX },
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
    OneTimeToken,
    McpCall,
    Member,
    Assignment,
    Milestone,
    Task,
    Risk,
    ConnectorConfig,
    NotificationSetting,
    Minutes,
    Block,
    BlockLink,
    UserDigestPreference,
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
