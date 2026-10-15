import type { IngestSignal } from "../services/signalService.js";
import { AppError } from "../errors/index.js";
import type { Connector, ConnectorContext } from "./types.js";
import { httpJson } from "./types.js";

export interface ConfluencePage {
  id: string;
  title: string;
  version?: { when?: string; by?: { displayName?: string } | null } | null;
  history?: { createdDate?: string; createdBy?: { displayName?: string } | null } | null;
}
export interface ConfluenceResponse {
  results: ConfluencePage[];
}

/** Mapper PUR : pages Confluence → signaux normalisés (testable). */
export function mapConfluence(projectId: string, pages: ConfluencePage[]): IngestSignal[] {
  return pages.map((p) => {
    const when = p.version?.when ?? p.history?.createdDate ?? new Date().toISOString();
    const actor = p.version?.by?.displayName ?? p.history?.createdBy?.displayName ?? null;
    return {
      projectId,
      source: "confluence" as const,
      type: "document" as const,
      occurredAt: new Date(when),
      actor,
      payload: { key: p.id, title: p.title },
    };
  });
}

export const confluenceConnector: Connector = {
  provider: "confluence",
  async fetchSignals(ctx: ConnectorContext): Promise<IngestSignal[]> {
    const host = (ctx.settings.host || "").replace(/\/$/, "");
    const { email, spaceKey } = ctx.settings;
    if (!host || !email || !spaceKey) {
      throw new AppError(400, "invalid_config", "host, email et spaceKey Confluence requis");
    }
    if (!ctx.token) throw new AppError(400, "no_token", "Token Confluence requis");
    // Confluence Cloud : authentification Basic email:token (comme Jira).
    const auth = Buffer.from(`${email}:${ctx.token}`).toString("base64");
    const url =
      `${host}/rest/api/content?spaceKey=${encodeURIComponent(spaceKey)}` +
      `&limit=100&orderby=-history.lastUpdated&expand=version,history`;
    const data = await httpJson<ConfluenceResponse>(
      url,
      { headers: { Authorization: `Basic ${auth}`, Accept: "application/json" } },
      "confluence",
    );
    return mapConfluence(ctx.projectId, data.results ?? []);
  },
};
