/**
 * Vocabulaire métier : traduit le jargon technique en langage « chef de projet »
 * et porte les définitions affichées dans les infobulles et le glossaire.
 */
export interface Term {
  /** Clé stable (identifiant du terme). */
  key: string;
  /** Terme technique d'origine. */
  technical: string;
  /** Libellé métier à afficher en mode simple. */
  plain: string;
  /** Définition courte, compréhensible sans bagage technique. */
  definition: string;
}

export const GLOSSARY: Term[] = [
  {
    key: "commit",
    technical: "commit",
    plain: "activité de développement",
    definition:
      "Une modification de code enregistrée par un développeur. Le volume de commits reflète l'activité sur le projet.",
  },
  {
    key: "pull_request",
    technical: "pull request (PR)",
    plain: "relecture de code",
    definition:
      "Une proposition de modification soumise à relecture avant d'être intégrée. Des PR en attente signalent des relectures à faire.",
  },
  {
    key: "issue",
    technical: "issue",
    plain: "ticket",
    definition:
      "Une demande, un bug ou une tâche enregistrée sur le projet. Une hausse d'issues ouvertes peut indiquer une accumulation de travail.",
  },
  {
    key: "anomaly",
    technical: "anomalie",
    plain: "point d'attention",
    definition:
      "Un écart inhabituel détecté automatiquement (ex. chute d'activité). Classé par gravité : à surveiller ou critique.",
  },
  {
    key: "decision",
    technical: "décision d'agent",
    plain: "recommandation",
    definition:
      "Une proposition faite par un agent (diagnostic ou plan d'action). Certaines s'appliquent seules, d'autres demandent votre approbation.",
  },
  {
    key: "velocity",
    technical: "vélocité",
    plain: "rythme d'avancement",
    definition:
      "La quantité de travail livrée par semaine. Sert à estimer les délais et l'impact d'un changement d'équipe.",
  },
  {
    key: "forecast",
    technical: "forecast",
    plain: "alerte précoce",
    definition:
      "Une projection des tendances récentes pour repérer un risque avant qu'il ne devienne bloquant.",
  },
  {
    key: "gravity",
    technical: "gravité",
    plain: "impact d'un déplacement",
    definition:
      "Un score 0–100 estimant à quel point retirer une personne d'un projet le perturbe (perte de rythme et d'expertise).",
  },
  {
    key: "health",
    technical: "santé globale",
    plain: "santé globale",
    definition:
      "Un indicateur 0–100 résumant l'état de vos projets : il baisse quand des points critiques ou des approbations s'accumulent.",
  },
  {
    key: "guest",
    technical: "mode invité",
    plain: "mode invité",
    definition:
      "Un compte d'essai sans inscription, limité à un projet et non sauvegardé durablement. Créez un compte pour conserver votre travail.",
  },
];

const BY_KEY = new Map(GLOSSARY.map((t) => [t.key, t]));

/** Récupère un terme par sa clé. */
export function term(key: string): Term | undefined {
  return BY_KEY.get(key);
}
