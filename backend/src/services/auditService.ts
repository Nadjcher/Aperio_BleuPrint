import { AppDataSource } from "../db/data-source.js";
import { AuditLog } from "../entities/AuditLog.js";
import { logger } from "../utils/logger.js";

/** Tronque une IP pour minimiser la donnée (dernier octet / segment masqué). */
export function anonymizeIp(ip: string | undefined): string | null {
  if (!ip) return null;
  if (ip.includes(".")) return ip.replace(/\.\d+$/, ".0"); // IPv4
  if (ip.includes(":")) return ip.split(":").slice(0, 4).join(":") + "::"; // IPv6
  return null;
}

export async function audit(entry: {
  actorId?: string | null;
  action: string;
  target?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const repo = AppDataSource.getRepository(AuditLog);
    await repo.save(
      repo.create({
        actorId: entry.actorId ?? null,
        action: entry.action,
        target: entry.target ?? null,
        ip: entry.ip ?? null,
        metadata: entry.metadata ?? {},
      }),
    );
  } catch (err) {
    // Un échec d'audit ne doit jamais casser la requête métier.
    logger.warn({ err, action: entry.action }, "Échec d'écriture du journal d'audit");
  }
}
