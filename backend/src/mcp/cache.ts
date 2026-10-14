import { env } from "../config/env.js";

/**
 * Cache mémoire à TTL pour les résultats MCP (« pas de double appel si data
 * < 1h »). En mémoire process : simple et suffisant à cette échelle ; peut être
 * remplacé par Redis plus tard sans changer l'interface.
 */
interface Entry {
  value: unknown;
  expiresAt: number;
}

const store = new Map<string, Entry>();

export function cacheGet(key: string): { hit: boolean; value?: unknown } {
  const e = store.get(key);
  if (!e) return { hit: false };
  if (Date.now() > e.expiresAt) {
    store.delete(key);
    return { hit: false };
  }
  return { hit: true, value: e.value };
}

export function cacheSet(key: string, value: unknown): void {
  store.set(key, { value, expiresAt: Date.now() + env.MCP_CACHE_TTL_MS });
}

export function cacheKey(server: string, tool: string, args: unknown): string {
  // Clé stable : les clés d'objet sont triées pour éviter les faux « miss ».
  return `${server}::${tool}::${stableStringify(args)}`;
}

export function cacheClear(): void {
  store.clear();
}

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const obj = v as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}
