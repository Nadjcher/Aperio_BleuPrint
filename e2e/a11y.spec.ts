import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { authenticate, registerUser } from "./helpers";

/**
 * Navigue puis attend le montage de l'app React. Le serveur de preview peut
 * servir une coquille vide juste après son démarrage : on recharge alors la
 * page (quelques essais) avant d'auditer.
 */
async function gotoMounted(page: import("@playwright/test").Page, path: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(path, { waitUntil: "networkidle" });
    try {
      await page.waitForSelector("#root > *", { timeout: 4000 });
      return;
    } catch {
      await page.reload({ waitUntil: "networkidle" });
    }
  }
  await page.waitForSelector("#root > *", { timeout: 4000 });
}

/** Pages publiques + authentifiées à auditer (axe-core, WCAG A/AA). */
async function scan(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  // On bloque sur les violations graves (serious) et critiques.
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  return blocking;
}

test.describe("Accessibilité (axe-core)", () => {
  test("pages publiques sans violation grave", async ({ page }) => {
    for (const path of ["/", "/login", "/legal/confidentialite", "/legal/cgu"]) {
      await gotoMounted(page, path);
      const blocking = await scan(page);
      expect(blocking, `${path} : ${blocking.map((b) => b.id).join(", ")}`).toEqual([]);
    }
  });

  test("pages authentifiées sans violation grave", async ({ page }) => {
    const user = await registerUser(page);
    await authenticate(page, user.access, user.refresh);
    for (const path of ["/dashboard", "/projects", "/team", "/glossaire"]) {
      await gotoMounted(page, path);
      await page.waitForTimeout(500); // laisse les données se charger
      const blocking = await scan(page);
      expect(blocking, `${path} : ${blocking.map((b) => b.id).join(", ")}`).toEqual([]);
    }
  });
});
