import type { Page } from "@playwright/test";

export const API = process.env.E2E_API_URL ?? "http://localhost:4100";

/** Inscrit un nouvel utilisateur unique et renvoie ses tokens. */
export async function registerUser(page: Page): Promise<{ email: string; access: string; refresh: string }> {
  const email = `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@aperio.io`;
  const res = await page.request.post(`${API}/api/v1/auth/register`, {
    data: { email, password: "Kx7mNp9qRt2wZ", name: "E2E Testeur" },
  });
  const body = await res.json();
  return { email, access: body.tokens.accessToken, refresh: body.tokens.refreshToken };
}

/** Injecte des tokens dans le localStorage (session authentifiée). */
export async function authenticate(page: Page, access: string, refresh: string): Promise<void> {
  await page.goto("/");
  await page.evaluate(
    ([a, r]) => {
      localStorage.setItem("pm.accessToken", a);
      localStorage.setItem("pm.refreshToken", r);
    },
    [access, refresh],
  );
}
