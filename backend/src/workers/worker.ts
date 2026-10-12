import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import * as jobService from "../services/jobService.js";
import { syncProject } from "../services/pipelineService.js";
import type { Job } from "../entities/Job.js";

let running = false;
let timer: NodeJS.Timeout | null = null;

async function process(job: Job): Promise<void> {
  try {
    switch (job.type) {
      case "project_sync": {
        const result = await syncProject(job.projectId);
        await jobService.markDone(job.id, { ...result });
        logger.info({ jobId: job.id, projectId: job.projectId }, "Job terminé");
        break;
      }
      default:
        await jobService.markFailed(job.id, `Type inconnu: ${job.type}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    await jobService.markFailed(job.id, message);
    logger.warn({ jobId: job.id, err }, "Job en échec");
  }
}

/** Dépile les jobs en attente jusqu'à ce qu'il n'y en ait plus. */
async function drain(): Promise<void> {
  if (running) return;
  running = true;
  try {
    let job = await jobService.claimNext();
    while (job) {
      await process(job);
      job = await jobService.claimNext();
    }
  } catch (err) {
    logger.warn({ err }, "Boucle worker en échec");
  } finally {
    running = false;
  }
}

/** Démarre le worker (polling). Désactivable via WORKER_ENABLED=false. */
export function startWorker(): void {
  if (!env.WORKER_ENABLED) {
    logger.info("Worker désactivé (WORKER_ENABLED=false)");
    return;
  }
  logger.info({ pollMs: env.WORKER_POLL_MS }, "Worker démarré");
  timer = setInterval(() => void drain(), env.WORKER_POLL_MS);
  // Premier passage immédiat
  void drain();
}

export function stopWorker(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
