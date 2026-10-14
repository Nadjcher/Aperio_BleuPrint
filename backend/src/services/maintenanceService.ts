import { LessThan } from "typeorm";
import { AppDataSource } from "../db/data-source.js";
import { AuditLog } from "../entities/AuditLog.js";
import { RefreshToken } from "../entities/RefreshToken.js";
import { OneTimeToken } from "../entities/OneTimeToken.js";
import { User } from "../entities/User.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { eraseUser } from "./gdprService.js";
import { expireStaleApprovals } from "./decisionService.js";

export interface PurgeResult {
  auditLogs: number;
  refreshTokens: number;
  oneTimeTokens: number;
  guests: number;
  expiredApprovals: number;
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

  // Jetons à usage unique expirés ou déjà consommés.
  const otExpired = await AppDataSource.getRepository(OneTimeToken).delete({
    expiresAt: LessThan(new Date()),
  });

  // Comptes INVITÉS périmés : essai sans suite → suppression complète (RGPD +
  // anti-pollution de la base). On réutilise l'effacement GDPR pour tout nettoyer.
  const guestCutoff = new Date(Date.now() - env.GUEST_TTL_HOURS * 3600 * 1000);
  const staleGuests = await AppDataSource.getRepository(User).find({
    where: { isGuest: true, createdAt: LessThan(guestCutoff) },
    select: ["id"],
  });
  let guests = 0;
  for (const g of staleGuests) {
    try {
      await eraseUser(g.id);
      guests += 1;
    } catch (err) {
      logger.warn({ err, userId: g.id }, "Échec de purge d'un compte invité");
    }
  }

  // Décisions en attente d'approbation dont le délai est dépassé → expirées.
  const expiredApprovals = await expireStaleApprovals();

  return {
    auditLogs: audit.affected ?? 0,
    refreshTokens: (expired.affected ?? 0) + (revoked.affected ?? 0),
    oneTimeTokens: otExpired.affected ?? 0,
    guests,
    expiredApprovals,
  };
}

let timer: NodeJS.Timeout | null = null;

/** Démarre la purge périodique (un passage immédiat puis à intervalle régulier). */
export function startMaintenance(): void {
  const run = (): void => {
    purgeExpiredData()
      .then((r) => {
        if (r.auditLogs || r.refreshTokens || r.oneTimeTokens || r.guests || r.expiredApprovals) {
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
