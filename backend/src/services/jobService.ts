import type { Job as JobDTO, JobType } from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { Job } from "../entities/Job.js";

const jobs = () => AppDataSource.getRepository(Job);

export function toDTO(j: Job): JobDTO {
  return {
    id: j.id,
    type: j.type,
    projectId: j.projectId,
    status: j.status,
    attempts: j.attempts,
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
  const saved = await jobs().save(jobs().create({ type, projectId }));
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
       WHERE "status" = 'pending'
       ORDER BY "createdAt" ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`,
  );
  return rows[0] ? (jobs().create(rows[0] as Partial<Job>) as Job) : null;
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

export async function markFailed(id: string, error: string): Promise<void> {
  await jobs().update({ id }, { status: "failed", error });
}
