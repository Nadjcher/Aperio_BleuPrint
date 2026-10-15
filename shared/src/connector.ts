/** Connecteurs de sources de données (abstraction multi-providers). */

export type ConnectorProvider =
  | "github"
  | "gitlab"
  | "jira"
  | "linear"
  | "confluence"
  | "notion";

export const CONNECTOR_PROVIDERS: ConnectorProvider[] = [
  "github",
  "gitlab",
  "jira",
  "linear",
  "confluence",
  "notion",
];

/** Métadonnées d'un provider pour l'UI (champs de config requis). */
export interface ConnectorMeta {
  provider: ConnectorProvider;
  label: string;
  /** Champs de configuration (clé → libellé). Le token est géré à part. */
  settings: { key: string; label: string; placeholder?: string; required?: boolean }[];
  /** Le provider nécessite-t-il un token ? */
  needsToken: boolean;
  hint: string;
}

export const CONNECTOR_META: Record<ConnectorProvider, ConnectorMeta> = {
  github: {
    provider: "github",
    label: "GitHub",
    settings: [{ key: "repo", label: "Dépôt (owner/repo)", placeholder: "facebook/react", required: true }],
    needsToken: true,
    hint: "Commits, pull requests et issues d'un dépôt GitHub.",
  },
  gitlab: {
    provider: "gitlab",
    label: "GitLab",
    settings: [
      { key: "host", label: "Hôte", placeholder: "https://gitlab.com" },
      { key: "projectId", label: "ID ou chemin du projet", placeholder: "group/projet", required: true },
    ],
    needsToken: true,
    hint: "Commits, merge requests et issues d'un projet GitLab.",
  },
  jira: {
    provider: "jira",
    label: "Jira",
    settings: [
      { key: "host", label: "Hôte", placeholder: "https://votresite.atlassian.net", required: true },
      { key: "email", label: "E-mail du compte", placeholder: "vous@exemple.com", required: true },
      { key: "projectKey", label: "Clé de projet", placeholder: "ABC", required: true },
    ],
    needsToken: true,
    hint: "Tickets (issues) d'un projet Jira Cloud.",
  },
  linear: {
    provider: "linear",
    label: "Linear",
    settings: [{ key: "teamId", label: "ID d'équipe", placeholder: "TEAM-UUID", required: true }],
    needsToken: true,
    hint: "Tickets (issues) d'une équipe Linear.",
  },
  confluence: {
    provider: "confluence",
    label: "Confluence",
    settings: [
      { key: "host", label: "Hôte", placeholder: "https://votresite.atlassian.net/wiki", required: true },
      { key: "email", label: "E-mail du compte", placeholder: "vous@exemple.com", required: true },
      { key: "spaceKey", label: "Clé d'espace", placeholder: "PROJ", required: true },
    ],
    needsToken: true,
    hint: "Pages récentes d'un espace Confluence Cloud (spécifications, comptes-rendus).",
  },
  notion: {
    provider: "notion",
    label: "Notion",
    settings: [],
    needsToken: true,
    hint: "Pages récemment modifiées accessibles à votre intégration Notion.",
  },
};

/** Configuration connecteur d'un projet (le token n'est jamais renvoyé). */
export interface ConnectorConfig {
  projectId: string;
  provider: ConnectorProvider;
  settings: Record<string, string>;
  /** Vrai si un token est enregistré (chiffré en base). */
  hasToken: boolean;
  updatedAt: string;
}
