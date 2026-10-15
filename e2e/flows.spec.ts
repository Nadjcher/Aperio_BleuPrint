import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { API, authenticate, registerUser } from "./helpers";

test.describe("Parcours principaux", () => {
  test("inscription → onboarding → création de projet", async ({ page }) => {
    // Inscription via l'UI.
    await page.goto("/login");
    await page.getByRole("tab", { name: "Inscription" }).click();
    const email = `e2e_ui_${Date.now()}@aperio.io`;
    await page.locator("#auth-name").fill("Testeur UI");
    await page.locator("#auth-email").fill(email);
    await page.locator("#auth-password").fill("Kx7mNp9qRt2wZ");
    await page.getByRole("button", { name: "Créer mon compte" }).click();

    // Redirigé vers l'onboarding.
    await expect(page.getByRole("heading", { name: "Démarrez en 3 étapes" })).toBeVisible();

    // Étape 1 : nom du projet.
    await page.getByLabel("Nom du projet").fill("Projet E2E");
    await page.getByRole("button", { name: "Continuer →" }).click();

    // Étape 2 : créer le projet (sans dépôt).
    await page.getByRole("button", { name: "Créer le projet →" }).click();

    // Étape 3 : terminer → tableau de bord.
    await page.getByRole("button", { name: "Terminer →" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Le projet apparaît dans la liste.
    await page.goto("/projects");
    await expect(page.getByText("Projet E2E")).toBeVisible();
  });

  test("planning : ajout d'un jalon et d'une tâche", async ({ page }) => {
    const user = await registerUser(page);
    const proj = await (
      await page.request.post(`${API}/api/v1/projects`, {
        headers: { authorization: `Bearer ${user.access}` },
        data: { name: "Projet Planning" },
      })
    ).json();
    await authenticate(page, user.access, user.refresh);

    await page.goto(`/projects/${proj.id}/planning`);
    await expect(page.getByRole("heading", { name: /date de livraison/i })).toBeVisible();

    await page.getByLabel(/Nouveau/).fill("Jalon 1");
    await page.getByRole("button", { name: "+ Ajouter" }).click();
    await expect(page.getByText("Jalon 1")).toBeVisible();

    // Ajout d'une tâche au jalon.
    await page.getByPlaceholder(/Ajouter une/).first().fill("Tâche A");
    await page.getByRole("button", { name: "Ajouter", exact: true }).first().click();
    await expect(page.getByText("Tâche A")).toBeVisible();
  });

  test("registre des risques : ajout et score auto", async ({ page }) => {
    const user = await registerUser(page);
    const proj = await (
      await page.request.post(`${API}/api/v1/projects`, {
        headers: { authorization: `Bearer ${user.access}` },
        data: { name: "Projet Risques" },
      })
    ).json();
    await authenticate(page, user.access, user.refresh);

    await page.goto(`/projects/${proj.id}/risks`);
    await page.getByLabel("Nouveau risque").fill("Risque E2E");
    await page.getByRole("button", { name: "+ Ajouter" }).click();
    await expect(page.getByText("Risque E2E")).toBeVisible();
    // Proba 3 × impact 3 = 9 → niveau Moyen.
    await expect(page.getByText("Moyen")).toBeVisible();
  });

  test("intégrations : configuration d'un connecteur (token chiffré)", async ({ page }) => {
    const user = await registerUser(page);
    const proj = await (
      await page.request.post(`${API}/api/v1/projects`, {
        headers: { authorization: `Bearer ${user.access}` },
        data: { name: "Projet Intégrations" },
      })
    ).json();
    await authenticate(page, user.access, user.refresh);

    await page.goto(`/projects/${proj.id}/integrations`);
    await page.getByLabel("Fournisseur").selectOption("gitlab");
    // Le changement de provider réinitialise les champs : on attend ce rendu
    // avant de saisir, pour éviter que la saisie soit écrasée.
    await expect(page.getByText("Commits, merge requests")).toBeVisible();
    await page.getByLabel(/chemin du projet/i).fill("group/app");
    await page.getByLabel(/^Token/).fill("glpat-e2e-secret");
    await page.getByRole("button", { name: "Enregistrer" }).first().click();

    // Vérifie le résultat réel côté API : token enregistré, jamais renvoyé.
    await expect
      .poll(
        async () => {
          const r = await page.request.get(`${API}/api/v1/projects/${proj.id}/connector`, {
            headers: { authorization: `Bearer ${user.access}` },
          });
          return (await r.json())?.hasToken ?? false;
        },
        { timeout: 8000 },
      )
      .toBe(true);

    const cfg = await (
      await page.request.get(`${API}/api/v1/projects/${proj.id}/connector`, {
        headers: { authorization: `Bearer ${user.access}` },
      })
    ).json();
    expect(cfg.provider).toBe("gitlab");
    expect(JSON.stringify(cfg)).not.toContain("glpat");
  });

  test("import d'un document PDF : extraction du texte → signal", async ({ page }) => {
    const user = await registerUser(page);
    const proj = await (
      await page.request.post(`${API}/api/v1/projects`, {
        headers: { authorization: `Bearer ${user.access}` },
        data: { name: "Projet Documents" },
      })
    ).json();

    // Chemin relatif à la racine du dépôt (cwd d'exécution de Playwright).
    const pdf = readFileSync("e2e/fixtures/sample.pdf");
    const res = await page.request.post(`${API}/api/v1/projects/${proj.id}/documents`, {
      headers: { authorization: `Bearer ${user.access}` },
      data: { filename: "cahier.pdf", kind: "pdf", contentBase64: pdf.toString("base64") },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("cahier.pdf");
    expect(body.chars).toBeGreaterThan(0);

    // Le texte extrait est stocké sous forme de signal « document ».
    const sig = await (
      await page.request.get(`${API}/api/v1/projects/${proj.id}/signals`, {
        headers: { authorization: `Bearer ${user.access}` },
      })
    ).json();
    const doc = sig.items.find((s: { source: string }) => s.source === "document");
    expect(doc).toBeTruthy();
    expect(doc.payload.kind).toBe("pdf");
    expect(String(doc.payload.excerpt)).toContain("Aperio");

    // Un projet sans dépôt mais avec un connecteur peut être synchronisé
    // (régression : la route /sync n'exige plus un dépôt GitHub).
    await page.request.put(`${API}/api/v1/projects/${proj.id}/connector`, {
      headers: { authorization: `Bearer ${user.access}` },
      data: {
        provider: "confluence",
        settings: { host: "https://exemple.invalid", email: "pm@exemple.com", spaceKey: "PROJ" },
        token: "dummy-token",
      },
    });
    const sync = await page.request.post(`${API}/api/v1/projects/${proj.id}/sync`, {
      headers: { authorization: `Bearer ${user.access}` },
    });
    expect(sync.status()).toBe(202);
  });

  test("RGPD : export des données de l'utilisateur", async ({ page }) => {
    const user = await registerUser(page);
    const res = await page.request.get(`${API}/api/v1/gdpr/export`, {
      headers: { authorization: `Bearer ${user.access}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    // L'export contient au moins le profil de l'utilisateur.
    expect(JSON.stringify(data)).toContain(user.email);
  });
});
