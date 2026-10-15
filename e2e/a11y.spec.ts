import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { authenticate, registerUser } from "./helpers";

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
      await page.goto(path);
      const blocking = await scan(page);
      expect(blocking, `${path} : ${blocking.map((b) => b.id).join(", ")}`).toEqual([]);
    }
  });

  test("pages authentifiées sans violation grave", async ({ page }) => {
    const user = await registerUser(page);
    await authenticate(page, user.access, user.refresh);
    for (const path of ["/dashboard", "/projects", "/team", "/glossaire"]) {
      await page.goto(path);
      await page.waitForTimeout(800);
      const blocking = await scan(page);
      expect(blocking, `${path} : ${blocking.map((b) => b.id).join(", ")}`).toEqual([]);
    }
  });
});
