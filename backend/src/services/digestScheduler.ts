import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { runDueDigests } from "./digestService.js";

/**
 * Planificateur de digests. Comme la maintenance RGPD, il repose sur un simple
 * setInterval (pas de dépendance cron) : à chaque tick il envoie les briefings
 * « dus ». La granularité d'envoi vient de l'heure choisie par l'utilisateur et
 * du garde-fou « déjà envoyé aujourd'hui », pas de la fréquence du tick — un
 * tick court (~15 min) suffit à livrer à l'heure voulue.
 */
let timer: NodeJS.Timeout | null = null;

export function startDigestScheduler(): void {
  const run = (): void => {
    runDueDigests().catch((err) => logger.warn({ err }, "Planificateur de digests en échec"));
  };
  timer = setInterval(run, env.DIGEST_TICK_MS);
  run();
}

export function stopDigestScheduler(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
