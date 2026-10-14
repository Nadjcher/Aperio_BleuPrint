import type { DetectionResult } from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { User } from "../entities/User.js";
import { Project } from "../entities/Project.js";
import { Anomaly } from "../entities/Anomaly.js";
import { Decision } from "../entities/Decision.js";
import { appBaseUrl, sendEmail } from "../email/index.js";
import { anomalyAlertEmail, weeklyDigestEmail, type DigestProject } from "../email/templates.js";
import { logger } from "../utils/logger.js";

/** Un e-mail n'est envoyé qu'à un vrai destinataire opté-in (pas les invités). */
function canEmail(user: User | null): user is User {
  return !!user && !user.isGuest && user.notifyByEmail && !user.email.endsWith("@guest.aperio.local");
}

/** Alerte d'anomalie : prévient le propriétaire du projet (si opté-in). */
export async function notifyAnomaly(
  project: Project,
  detection: DetectionResult,
): Promise<void> {
  const owner = await AppDataSource.getRepository(User).findOne({
    where: { id: project.ownerId },
  });
  if (!canEmail(owner)) return;
  const link = `${appBaseUrl()}/projects/${project.id}`;
  await sendEmail(
    anomalyAlertEmail(owner.email, owner.name, {
      projectName: project.name,
      metric: detection.metric,
      severity: detection.severity,
      observed: detection.observed,
      expected: Math.round(detection.expected * 100) / 100,
      explanation: `Écart de ${detection.zScore.toFixed(1)}σ par rapport à la normale.`,
      link,
    }),
  );
}

/**
 * Digest hebdomadaire : pour chaque utilisateur opté-in, un récap de ses projets
 * (anomalies + décisions des 7 derniers jours). Déclenchable par un cron externe
 * via POST /notifications/digest. Retourne le nombre d'e-mails envoyés.
 */
export async function sendWeeklyDigests(): Promise<number> {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const users = await AppDataSource.getRepository(User).find();
  let sent = 0;

  for (const user of users) {
    if (!canEmail(user)) continue;
    const projects = await AppDataSource.getRepository(Project).find({
      where: { ownerId: user.id },
    });
    if (projects.length === 0) continue;

    const lines: DigestProject[] = [];
    for (const p of projects) {
      const anomalies = await AppDataSource.getRepository(Anomaly)
        .createQueryBuilder("a")
        .where("a.projectId = :pid", { pid: p.id })
        .andWhere("a.detectedAt >= :since", { since })
        .getCount();
      const decisions = await AppDataSource.getRepository(Decision)
        .createQueryBuilder("d")
        .where("d.projectId = :pid", { pid: p.id })
        .andWhere("d.createdAt >= :since", { since })
        .getCount();
      lines.push({ name: p.name, anomalies, decisions });
    }

    const ok = await sendEmail(
      weeklyDigestEmail(user.email, user.name, lines, `${appBaseUrl()}/dashboard`),
    );
    if (ok) sent += 1;
  }
  logger.info({ sent }, "Digest hebdomadaire envoyé");
  return sent;
}
