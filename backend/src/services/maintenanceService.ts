import { LessThan } from "typeorm";
import { AppDataSource } from "../db/data-source.js";
import { AuditLog } from "../entities/AuditLog.js";
import { RefreshToken } from "../entities/RefreshToken.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export interface PurgeResult {
  auditLogs: number;
  refreshTokens: number;
}

/**
 * RGPD — conservation limitée. Purge :
 *  - les journaux d'audit plus vieux que AUDIT_RETENTION_DAYS ;
 *  - les refresh tokens expirés ou révoqués (ils n'ont plus d'utilité).
 * Idempotent et sûr à lancer périodiquement.
 */
export async function purgeExpiredData(): Promise<PurgeResult> {
  const cutoff = new Date(Date.now() - env.AUDIT_RETENTION_DAYS * 24 * 3600 * 1000);

  const audit = await AppDataSource.getRepository(AuditLog).delete({
    createdAt: LessThan(cutoff),
  });

  // Tokens expirés…
  const expired = await AppDataSource.getRepository(RefreshToken).delete({
    expiresAt: LessThan(new Date()),
  });
  // …et tokens révoqués (rotation / logout) : plus aucune valeur à les garder.
  const revoked = await AppDataSource.getRepository(RefreshToken).delete({
    revoked: true,
  });

  return {
    auditLogs: audit.affected ?? 0,
    refreshTokens: (expired.affected ?? 0) + (revoked.affected ?? 0),
  };
}

let timer: NodeJS.Timeout | null = null;

/** Démarre la purge périodique (un passage immédiat puis à intervalle régulier). */
export function startMaintenance(): void {
  const run = (): void => {
    purgeExpiredData()
      .then((r) => {
        if (r.auditLogs || r.refreshTokens) {
          logger.info(r, "Purge RGPD : données expirées supprimées");
        }
      })
      .catch((err) => logger.warn({ err }, "Purge RGPD en échec"));
  };
  timer = setInterval(run, env.MAINTENANCE_INTERVAL_MS);
  run();
}

export function stopMaintenance(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
