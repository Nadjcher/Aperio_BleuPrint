import type { IngestSignal } from "../services/signalService.js";
import { AppError } from "../errors/index.js";
import type { Connector, ConnectorContext } from "./types.js";
import { httpJson } from "./types.js";

interface NotionRichText {
  plain_text?: string;
}
interface NotionProperty {
  type?: string;
  title?: NotionRichText[];
}
export interface NotionPage {
  id: string;
  created_time?: string;
  last_edited_time?: string;
  properties?: Record<string, NotionProperty>;
}
export interface NotionSearchResponse {
  results: NotionPage[];
}

/** Extrait le titre d'une page Notion (propriété de type "title"). */
function titleOf(page: NotionPage): string {
  const props = page.properties ?? {};
  for (const prop of Object.values(props)) {
    if (prop.type === "title" && prop.title) {
      const text = prop.title.map((t) => t.plain_text ?? "").join("").trim();
      if (text) return text;
    }
  }
  return "(sans titre)";
}

/** Mapper PUR : pages Notion → signaux normalisés (testable). */
export function mapNotion(projectId: string, pages: NotionPage[]): IngestSignal[] {
  return pages.map((p) => ({
    projectId,
    source: "notion" as const,
    type: "document" as const,
    occurredAt: new Date(p.last_edited_time ?? p.created_time ?? new Date().toISOString()),
    actor: null,
    payload: { key: p.id, title: titleOf(p) },
  }));
}

export const notionConnector: Connector = {
  provider: "notion",
  async fetchSignals(ctx: ConnectorContext): Promise<IngestSignal[]> {
    if (!ctx.token) throw new AppError(400, "no_token", "Token Notion (secret d'intégration) requis");
    const data = await httpJson<NotionSearchResponse>(
      "https://api.notion.com/v1/search",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.token}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filter: { property: "object", value: "page" },
          sort: { direction: "descending", timestamp: "last_edited_time" },
          page_size: 100,
        }),
      },
      "notion",
    );
    return mapNotion(ctx.projectId, data.results ?? []);
  },
};
