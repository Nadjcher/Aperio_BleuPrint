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
/** Faits structurés fournis au LLM pour rédiger un point d'avancement. */
export interface StatusReportFacts {
  projectName: string;
  methodology: string;
  periodLabel: string;
  sinceLabel: string;
  rag: "vert" | "orange" | "rouge";
  headline: string;
  signalCount: number;
  delivery: string;
  lateMilestones: { name: string; dueDate?: string; projectedEnd?: string }[];
  upcomingMilestones: { name: string; dueDate?: string }[];
  risks: { title: string; severity: string; score: number; owner?: string }[];
  anomalies: { severity: string; explanation: string }[];
  pendingDecisions: { title: string }[];
}

/**
 * Point d'avancement projet « prêt à envoyer ». Le statut RAG et sa
 * justification sont CALCULÉS en amont (fiables) et imposés au LLM ; celui-ci
 * se charge uniquement de rédiger les sections en prose, sans rien inventer.
 */
export function statusReportPrompt(facts: StatusReportFacts): { system: string; user: string } {
  const system =
    "Tu es chef de projet. Tu rédiges un point d'avancement destiné aux parties " +
    "prenantes (direction, client, équipe) : clair, factuel, synthétique, en français, " +
    "prêt à être envoyé tel quel. " +
    "Utilise UNIQUEMENT les faits fournis — n'invente jamais de chiffre, de date ou d'événement. " +
    "Si une information manque, ne la mentionne pas. Pas de bla-bla, pas de superlatifs.\n\n" +
    "Rends un document Markdown avec EXACTEMENT ces sections, dans cet ordre :\n" +
    "## Point d'avancement — <nom du projet>\n" +
    "**Statut : <icône> <RAG>** — <justification fournie>\n" +
    "**Résumé exécutif** : 2 à 3 phrases.\n" +
    "**Ce qui a avancé** : puces, depuis le dernier rapport.\n" +
    "**À risque / en retard** : puces (jalons en retard, risques majeurs).\n" +
    "**Décisions attendues / besoins** : puces (ce dont le chef de projet a besoin des parties prenantes).\n" +
    "**Prochaines échéances** : puces.\n" +
    "Garde chaque section courte. Si une section n'a rien, écris « Rien à signaler ».";

  const icon = facts.rag === "rouge" ? "🔴" : facts.rag === "orange" ? "🟠" : "🟢";
  const user =
    `Statut imposé : ${icon} ${facts.rag.toUpperCase()} — ${facts.headline}\n` +
    `Faits (JSON) :\n${JSON.stringify(
      {
        projet: facts.projectName,
        méthodologie: facts.methodology,
        période: facts.periodLabel,
        depuis: facts.sinceLabel,
        activité_signaux: facts.signalCount,
        date_livraison_prévue: facts.delivery,
        jalons_en_retard: facts.lateMilestones,
        prochains_jalons: facts.upcomingMilestones,
        risques: facts.risks,
        anomalies: facts.anomalies,
        décisions_en_attente: facts.pendingDecisions,
      },
      null,
      1,
    )}`;

  return { system, user };
}

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
