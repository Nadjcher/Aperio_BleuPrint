/** Méthodologies de gestion de projet et vocabulaire associé. */

export type Methodology = "kanban" | "scrum" | "prince2" | "safe";

export const METHODOLOGIES: Methodology[] = ["kanban", "scrum", "prince2", "safe"];

/** Libellés de vocabulaire adaptés par méthodologie (même moteur de planning). */
export interface MethodologyVocab {
  /** Nom affiché de la méthodologie. */
  label: string;
  /** Un « jalon » du moteur, nommé selon la méthodologie. */
  milestone: string;
  milestonePlural: string;
  /** Une « tâche » du moteur. */
  task: string;
  taskPlural: string;
  /** Terme pour le rythme d'avancement. */
  velocity: string;
  /** Intitulé du rapport normé. */
  report: string;
  /** Courte description de la méthodologie. */
  hint: string;
}

export const METHODOLOGY_VOCAB: Record<Methodology, MethodologyVocab> = {
  kanban: {
    label: "Kanban",
    milestone: "étape",
    milestonePlural: "étapes",
    task: "carte",
    taskPlural: "cartes",
    velocity: "débit",
    report: "Rapport de flux",
    hint: "Flux continu de cartes, sans itérations.",
  },
  scrum: {
    label: "Scrum",
    milestone: "sprint",
    milestonePlural: "sprints",
    task: "story",
    taskPlural: "stories",
    velocity: "vélocité",
    report: "Burndown / revue de sprint",
    hint: "Itérations courtes (sprints) avec vélocité et burndown.",
  },
  prince2: {
    label: "PRINCE2",
    milestone: "étape (stage)",
    milestonePlural: "étapes (stages)",
    task: "lot de travail",
    taskPlural: "lots de travail",
    velocity: "rythme",
    report: "Highlight Report",
    hint: "Projet piloté par étapes, tolérances et rapports d'exception.",
  },
  safe: {
    label: "SAFe",
    milestone: "PI (Program Increment)",
    milestonePlural: "PI",
    task: "story",
    taskPlural: "stories",
    velocity: "vélocité",
    report: "Rapport de PI",
    hint: "Agile à l'échelle : epics, features, program increments.",
  },
};

export function vocabOf(m: Methodology): MethodologyVocab {
  return METHODOLOGY_VOCAB[m] ?? METHODOLOGY_VOCAB.kanban;
}
