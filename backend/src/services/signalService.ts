import type { SignalMetric } from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { Signal } from "../entities/Signal.js";

const signals = () => AppDataSource.getRepository(Signal);

export interface IngestSignal {
  projectId: string;
  source: Signal["source"];
  type: Signal["type"];
  occurredAt: Date;
  actor?: string | null;
  payload?: Record<string, unknown>;
}

/** Stocke un lot de signaux normalisés. */
export async function ingest(batch: IngestSignal[]): Promise<number> {
  if (batch.length === 0) return 0;
  const rows = batch.map((s) =>
    signals().create({
      projectId: s.projectId,
      source: s.source,
      type: s.type,
      occurredAt: s.occurredAt,
      actor: s.actor ?? null,
      payload: s.payload ?? {},
    }),
  );
  await signals().save(rows);
  return rows.length;
}

/**
 * Agrège le nombre de signaux par jour sur une fenêtre, par métrique simple.
 * Base de la détection d'anomalies v1.
 */
export async function dailyCounts(
  projectId: string,
  metricName: string,
  type: Signal["type"],
  days: number,
): Promise<SignalMetric[]> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);

  const rows = await signals()
    .createQueryBuilder("s")
    .select("date_trunc('day', s.occurredAt)", "day")
    .addSelect("count(*)", "value")
    .where("s.projectId = :projectId", { projectId })
    .andWhere("s.type = :type", { type })
    .andWhere("s.occurredAt >= :since", { since })
    .groupBy("day")
    .orderBy("day", "ASC")
    .getRawMany<{ day: Date; value: string }>();

  return rows.map((r) => {
    const start = new Date(r.day);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return {
      projectId,
      name: metricName,
      value: Number(r.value),
      windowStart: start.toISOString(),
      windowEnd: end.toISOString(),
    };
  });
}
