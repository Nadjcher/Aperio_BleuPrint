import type { Anomaly } from "@projectmaster/shared";

/**
 * Constructeurs de prompts pour l'enrichissement des agents et la synthèse.
 * Les prompts restent concis et demandent un format strict (JSON ou Markdown).
 */

const BASE_SYSTEM =
  "Tu es un assistant de gestion de projet logiciel. Tu analyses des signaux " +
  "d'activité (commits, PRs, issues) et des anomalies détectées statistiquement. " +
  "Tu réponds en français, de façon concrète et actionnable, sans bla-bla.";

function anomalyLines(anomalies: Anomaly[]): string {
  if (anomalies.length === 0) return "(aucune anomalie ouverte)";
  return anomalies
    .map(
      (a) =>
        `- [${a.severity}] ${a.metric}: observé ${a.observed.toFixed(1)}, ` +
        `attendu ${a.expected.toFixed(1)} (z=${a.zScore.toFixed(1)}). ${a.explanation}`,
    )
    .join("\n");
}

/** Analyst : diagnostic des causes probables, au format JSON. */
export function analystPrompt(anomalies: Anomaly[]): { system: string; user: string } {
  return {
    system: BASE_SYSTEM,
    user:
      "Diagnostique les causes probables de ces anomalies de projet.\n\n" +
      `Anomalies :\n${anomalyLines(anomalies)}\n\n` +
      'Réponds UNIQUEMENT par un JSON : {"rationale": "<diagnostic en 2 phrases>", ' +
      '"actions": ["<action 1>", "<action 2>"], "confidence": <0..1>}.',
  };
}

/** Planner : plan d'action correctif, au format JSON. */
export function plannerPrompt(anomalies: Anomaly[]): { system: string; user: string } {
  return {
    system: BASE_SYSTEM,
    user:
      "Propose un plan d'action correctif priorisé face à ces anomalies.\n\n" +
      `Anomalies :\n${anomalyLines(anomalies)}\n\n` +
      'Réponds UNIQUEMENT par un JSON : {"title": "<titre court>", ' +
      '"rationale": "<justification en 2 phrases>", "actions": ["<étape 1>", ' +
      '"<étape 2>", "<étape 3>"], "confidence": <0..1>}.',
  };
}

/** Synthèse de rapport périodique, au format Markdown. */
export function reportPrompt(input: {
  projectName: string;
  period: string;
  signalCount: number;
  anomalies: Anomaly[];
}): { system: string; user: string } {
  return {
    system: BASE_SYSTEM,
    user:
      `Rédige une synthèse d'état pour le projet « ${input.projectName} » ` +
      `sur la période ${input.period}.\n\n` +
      `Signaux collectés : ${input.signalCount}\n` +
      `Anomalies :\n${anomalyLines(input.anomalies)}\n\n` +
      "Format Markdown, 150 mots max, avec : un titre de niveau 2, un paragraphe " +
      "de synthèse, puis une liste « Points d'attention » et une liste " +
      "« Recommandations ». Pas d'introduction méta.",
  };
}
