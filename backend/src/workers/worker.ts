import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import * as jobService from "../services/jobService.js";
import { syncProject } from "../services/pipelineService.js";
import {
  jobProcessingDuration,
  jobsProcessedTotal,
} from "../observability/metrics.js";
import type { Job } from "../entities/Job.js";

let running = false;
let timer: NodeJS.Timeout | null = null;

async function process(job: Job): Promise<void> {
  const stop = jobProcessingDuration.startTimer({ type: job.type });
  const record = (outcome: "done" | "retry" | "failed"): void => {
    jobsProcessedTotal.inc({ type: job.type, outcome });
    stop({ type: job.type, outcome });
  };
  try {
    switch (job.type) {
      case "project_sync": {
        const result = await syncProject(job.projectId);
        await jobService.markDone(job.id, { ...result });
        record("done");
        logger.info({ jobId: job.id, projectId: job.projectId }, "Job terminé");
        break;
      }
      default: {
        const willRetry = await jobService.fail(job, `Type inconnu: ${job.type}`);
        record(willRetry ? "retry" : "failed");
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    const willRetry = await jobService.fail(job, message);
    record(willRetry ? "retry" : "failed");
    logger.warn(
      { jobId: job.id, attempts: job.attempts, maxAttempts: job.maxAttempts, willRetry, err },
      willRetry ? "Job en échec, nouvelle tentative programmée" : "Job en échec définitif",
    );
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
