import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { API, authenticate, registerUser } from "./helpers";

/** Crée une brique via l'API et renvoie son id. */
async function makeBlock(
  request: import("@playwright/test").APIRequestContext,
  token: string,
  projectId: string,
  name: string,
  targetDate?: string,
) {
  const res = await request.post(`${API}/api/v1/portfolio/blocks`, {
    headers: { authorization: `Bearer ${token}` },
    data: { projectId, name, type: "application", targetDate: targetDate ?? null },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).id as string;
}

test.describe("Carte du portefeuille", () => {
  test("états, propagation, bandeau et anti-cycle (API)", async ({ request }) => {
    const user = await registerUser({ request } as never);
    const proj = await (
      await request.post(`${API}/api/v1/projects`, {
        headers: { authorization: `Bearer ${user.access}` },
        data: { name: "Portefeuille" },
      })
    ).json();

    // B est rouge (échéance passée), A dépend de B.
    const b = await makeBlock(request, user.access, proj.id, "Référentiel client", "2026-01-01");
    const a = await makeBlock(request, user.access, proj.id, "Portail web"); // sans date -> vert de base

    const linkRes = await request.post(`${API}/api/v1/portfolio/links`, {
      headers: { authorization: `Bearer ${user.access}` },
      data: { fromId: a, toId: b },
    });
    expect(linkRes.status()).toBe(201);

    // Anti-cycle : B dépendrait de A -> cycle -> refus 409.
    const cycleRes = await request.post(`${API}/api/v1/portfolio/links`, {
      headers: { authorization: `Bearer ${user.access}` },
      data: { fromId: b, toId: a },
    });
    expect(cycleRes.status()).toBe(409);

    const map = await (
      await request.get(`${API}/api/v1/portfolio/map?projectId=${proj.id}`, {
        headers: { authorization: `Bearer ${user.access}` },
      })
    ).json();

    const byId = Object.fromEntries(map.blocks.map((x: { id: string }) => [x.id, x]));
    expect(byId[b].state).toBe("rouge");
    expect(byId[a].state).toBe("rouge"); // propagé
    expect(byId[b].bloque).toBe(1);
    expect(map.blockers[0]).toMatchObject({ id: b, bloque: 1 });
    expect(map.headline).toContain("bloque");
    expect(map.headline).toContain("Référentiel client");
  });

  test("UI : affichage de la carte, bandeau et panneau latéral", async ({ page }) => {
    const user = await registerUser(page);
    const proj = await (
      await page.request.post(`${API}/api/v1/projects`, {
        headers: { authorization: `Bearer ${user.access}` },
        data: { name: "Portefeuille UI" },
      })
    ).json();
    const b = await makeBlock(page.request, user.access, proj.id, "Référentiel client", "2026-01-01");
    await makeBlock(page.request, user.access, proj.id, "Portail web");
    await page.request.post(`${API}/api/v1/portfolio/links`, {
      headers: { authorization: `Bearer ${user.access}` },
      data: { fromId: (await firstOther(page, user.access, proj.id, b)), toId: b },
    });

    await authenticate(page, user.access, user.refresh);
    await page.goto("/portfolio");

    // Bandeau cohérent avec un état rouge présent.
    await expect(page.getByText(/brique rouge/i)).toBeVisible();

    // Les nœuds du graphe sont rendus.
    await page.waitForSelector(".react-flow__node", { timeout: 8000 });
    const nodes = await page.locator(".react-flow__node").count();
    expect(nodes).toBeGreaterThanOrEqual(2);

    // Accessibilité (axe) : la carte réelle ne doit pas comporter de violation grave.
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const blocking = axe.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(blocking, blocking.map((b) => b.id).join(", ")).toEqual([]);

    // Clic sur la brique -> panneau latéral avec la raison (texte propre au panneau).
    await page.locator(".react-flow__node", { hasText: "Référentiel client" }).first().click();
    await expect(page.getByRole("complementary")).toBeVisible();
    await expect(page.getByText(/Échéance dépassée/)).toBeVisible();
  });
});

/** Renvoie l'id d'une brique du projet différente de `exclude`. */
async function firstOther(
  page: import("@playwright/test").Page,
  token: string,
  projectId: string,
  exclude: string,
): Promise<string> {
  const map = await (
    await page.request.get(`${API}/api/v1/portfolio/map?projectId=${projectId}`, {
      headers: { authorization: `Bearer ${token}` },
    })
  ).json();
  return map.blocks.find((x: { id: string }) => x.id !== exclude).id;
}
