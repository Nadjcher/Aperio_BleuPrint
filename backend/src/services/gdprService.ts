import { AppDataSource } from "../db/data-source.js";
import { User } from "../entities/User.js";
import { RefreshToken } from "../entities/RefreshToken.js";
import { Project } from "../entities/Project.js";
import { DecisionFeedback } from "../entities/DecisionFeedback.js";
import { AuditLog } from "../entities/AuditLog.js";
import { AppError } from "../middleware/errorHandler.js";

/**
 * Service RGPD : droits d'accès (export), de portabilité et d'effacement.
 * Toutes les données rattachées à un utilisateur sont couvertes.
 */

export interface UserExport {
  exportedAt: string;
  user: Record<string, unknown>;
  projects: Record<string, unknown>[];
  feedback: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
}

/** Droit d'accès + portabilité : export structuré (JSON) de toutes les données. */
export async function exportUserData(userId: string): Promise<UserExport> {
  const user = await AppDataSource.getRepository(User).findOne({
    where: { id: userId },
  });
  if (!user) throw new AppError(404, "not_found", "Utilisateur introuvable");

  const projects = await AppDataSource.getRepository(Project).find({
    where: { ownerId: userId },
  });
  const feedback = await AppDataSource.getRepository(DecisionFeedback).find({
    where: { authorId: userId },
  });
  const auditLogs = await AppDataSource.getRepository(AuditLog).find({
    where: { actorId: userId },
  });

  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
    projects: projects.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
    feedback: feedback.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() })),
    auditLogs: auditLogs.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
  };
}

/**
 * Droit à l'effacement : suppression complète des données de l'utilisateur.
 * Les journaux d'audit sont anonymisés (actorId mis à null) plutôt que
 * supprimés, pour conserver l'intégrité de la piste d'audit.
 */
export async function eraseUser(userId: string): Promise<void> {
  await AppDataSource.transaction(async (m) => {
    const user = await m.getRepository(User).findOne({ where: { id: userId } });
    if (!user) throw new AppError(404, "not_found", "Utilisateur introuvable");

    await m.getRepository(RefreshToken).delete({ userId });
    await m.getRepository(DecisionFeedback).delete({ authorId: userId });
    await m.getRepository(Project).delete({ ownerId: userId });
    await m.getRepository(AuditLog).update({ actorId: userId }, { actorId: null });
    await m.getRepository(User).delete({ id: userId });
  });
}
