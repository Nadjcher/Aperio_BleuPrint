/** File de jobs asynchrones (exécution différée des pipelines). */

export type JobType = "project_sync";

export type JobStatus = "pending" | "running" | "done" | "failed";

export interface Job {
  id: string;
  type: JobType;
  projectId: string;
  status: JobStatus;
  /** Nombre de tentatives déjà effectuées. */
  attempts: number;
  /** Nombre maximal de tentatives avant échec définitif. */
  maxAttempts: number;
  /** Date à partir de laquelle le job est éligible (back-off entre tentatives). */
  runAfter: string;
  /** Résultat du job une fois terminé (ex. { ingested, anomalyDetected, decisions }). */
  result?: Record<string, unknown> | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}
