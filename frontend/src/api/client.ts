import type { ApiError, AuthTokens } from "@projectmaster/shared";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const API = `${BASE}/api/v1`;

const ACCESS_KEY = "pm.accessToken";
const REFRESH_KEY = "pm.refreshToken";

export const tokenStore = {
  get access(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(tokens: AuthTokens) {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class RequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Message lisible à partir d'une erreur inconnue (centralise le motif répété). */
export function toErrorMessage(err: unknown, fallback = "Une erreur est survenue"): string {
  if (err instanceof RequestError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

async function raw<T>(
  path: string,
  options: RequestInit & { retry?: boolean } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (tokenStore.access) {
    headers.set("Authorization", `Bearer ${tokenStore.access}`);
  }

  const res = await fetch(`${API}${path}`, { ...options, headers });

  // Rafraîchissement transparent une seule fois sur 401.
  if (res.status === 401 && options.retry !== false && tokenStore.refresh) {
    const refreshed = await tryRefresh();
    if (refreshed) return raw<T>(path, { ...options, retry: false });
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = (data as ApiError)?.error;
    throw new RequestError(
      res.status,
      err?.code ?? "error",
      err?.message ?? "Erreur réseau",
    );
  }
  return data as T;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokenStore.refresh }),
    });
    if (!res.ok) {
      tokenStore.clear();
      return false;
    }
    tokenStore.set((await res.json()) as AuthTokens);
    return true;
  } catch {
    tokenStore.clear();
    return false;
  }
}

export const api = {
  get: <T>(path: string) => raw<T>(path),
  post: <T>(path: string, body?: unknown) =>
    raw<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    raw<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => raw<T>(path, { method: "DELETE" }),
};
