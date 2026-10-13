import type { Job as JobDTO, JobType } from "@projectmaster/shared";
import { env } from "../config/env.js";
import { AppDataSource } from "../db/data-source.js";
import { Job } from "../entities/Job.js";

const jobs = () => AppDataSource.getRepository(Job);

/** Délai de back-off exponentiel avant la n-ième tentative (borné à 1h). */
export function backoffMs(attempts: number): number {
  const delay = env.JOB_BACKOFF_BASE_MS * 2 ** Math.max(0, attempts - 1);
  return Math.min(delay, 60 * 60 * 1000);
}

export function toDTO(j: Job): JobDTO {
  return {
    id: j.id,
    type: j.type,
    projectId: j.projectId,
    status: j.status,
    attempts: j.attempts,
    maxAttempts: j.maxAttempts,
    runAfter: j.runAfter.toISOString(),
    result: j.result,
    error: j.error,
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
  };
}

/** Enfile un job (statut pending). */
export async function enqueue(
  type: JobType,
  projectId: string,
): Promise<JobDTO> {
  const saved = await jobs().save(
    jobs().create({ type, projectId, maxAttempts: env.JOB_MAX_ATTEMPTS }),
  );
  return toDTO(saved);
}

export async function get(id: string): Promise<JobDTO | null> {
  const j = await jobs().findOne({ where: { id } });
  return j ? toDTO(j) : null;
}

/**
 * Réclame atomiquement le prochain job pending (FOR UPDATE SKIP LOCKED) :
 * sûr même avec plusieurs instances de worker en parallèle.
 */
export async function claimNext(): Promise<Job | null> {
  const rows = await AppDataSource.query(
    `UPDATE "jobs" SET "status" = 'running', "attempts" = "attempts" + 1, "updatedAt" = now()
     WHERE "id" = (
       SELECT "id" FROM "jobs"
       WHERE "status" = 'pending' AND "runAfter" <= now()
       ORDER BY "runAfter" ASC, "createdAt" ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`,
  );
  // Selon le driver, query() peut renvoyer soit [row, ...], soit [[row, ...], count].
  const row = (Array.isArray(rows[0]) ? rows[0][0] : rows[0]) as Job | undefined;
  return row ?? null;
}

export async function markDone(
  id: string,
  result: Record<string, unknown>,
): Promise<void> {
  // `result as never` : le champ jsonb n'est pas inférable par le type d'update de TypeORM.
  await jobs().update(
    { id },
    { status: "done", result: result as never, error: null },
  );
}

/**
 * Traite l'échec d'un job : si des tentatives restent, on le remet en `pending`
 * avec un back-off exponentiel (runAfter décalé) ; sinon il passe en `failed`.
 * Retourne true si le job sera retenté.
 */
export async function fail(job: Job, error: string): Promise<boolean> {
  const willRetry = job.attempts < job.maxAttempts;
  if (willRetry) {
    const runAfter = new Date(Date.now() + backoffMs(job.attempts));
    await jobs().update({ id: job.id }, { status: "pending", error, runAfter });
  } else {
    await jobs().update({ id: job.id }, { status: "failed", error });
  }
  return willRetry;
}
