import type { IngestSignal } from "../services/signalService.js";
import { AppError } from "../errors/index.js";
import type { Connector, ConnectorContext } from "./types.js";
import { httpJson } from "./types.js";

export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    status?: { name: string } | null;
    created: string;
    creator?: { displayName: string } | null;
  };
}
export interface JiraSearchResponse {
  issues: JiraIssue[];
}

/** Mapper PUR : issues Jira → signaux normalisés (testable). */
export function mapJira(projectId: string, issues: JiraIssue[]): IngestSignal[] {
  return issues.map((i) => ({
    projectId,
    source: "jira" as const,
    type: "issue" as const,
    occurredAt: new Date(i.fields.created),
    actor: i.fields.creator?.displayName ?? null,
    payload: { key: i.key, title: i.fields.summary, state: i.fields.status?.name ?? "unknown" },
  }));
}

export const jiraConnector: Connector = {
  provider: "jira",
  async fetchSignals(ctx: ConnectorContext): Promise<IngestSignal[]> {
    const host = (ctx.settings.host || "").replace(/\/$/, "");
    const { email, projectKey } = ctx.settings;
    if (!host || !email || !projectKey) {
      throw new AppError(400, "invalid_config", "host, email et projectKey Jira requis");
    }
    if (!ctx.token) throw new AppError(400, "no_token", "Token Jira requis");
    // Jira Cloud : authentification Basic email:token.
    const auth = Buffer.from(`${email}:${ctx.token}`).toString("base64");
    const jql = encodeURIComponent(`project="${projectKey}" ORDER BY created DESC`);
    const url = `${host}/rest/api/3/search?jql=${jql}&maxResults=100&fields=summary,status,created,creator`;
    const data = await httpJson<JiraSearchResponse>(
      url,
      { headers: { Authorization: `Basic ${auth}`, Accept: "application/json" } },
      "jira",
    );
    return mapJira(ctx.projectId, data.issues ?? []);
  },
};
