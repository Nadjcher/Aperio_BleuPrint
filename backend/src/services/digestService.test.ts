import { describe, expect, it } from "vitest";
import type { Briefing } from "@projectmaster/shared";
import { renderSlackText, renderTeamsCard, isDigestDue, isoDay } from "./digestService.js";

const BASE = "https://app.aperio.io";

function briefing(over: Partial<Briefing> = {}): Briefing {
  return {
    greeting: "Bonjour. 1 risque(s) critique(s) à traiter aujourd'hui.",
    generatedAt: "2026-10-16T06:00:00.000Z",
    items: [
      {
        priority: "critical",
        title: "Risque critique — Refonte e-commerce",
        detail: "Chute d'activité détectée.",
        projectId: "p1",
        projectName: "Refonte e-commerce",
        actions: [{ label: "Ouvrir le projet", to: "/projects/p1" }],
      },
      {
        priority: "important",
        title: "Jalon en retard probable — Refonte e-commerce",
        detail: "« Sprint 3 » risque de dépasser son échéance.",
        projectId: "p1",
        projectName: "Refonte e-commerce",
        actions: [{ label: "Voir le planning", to: "/projects/p1/planning" }],
      },
    ],
    counts: { critical: 1, important: 1, fyi: 0, win: 0 },
    health: { score: 67, risk: "élevé" },
    activity7d: 12,
    ...over,
  };
}

describe("renderSlackText", () => {
  it("inclut la santé, les liens absolus et une puce par élément", () => {
    const txt = renderSlackText(briefing(), BASE);
    expect(txt).toContain("67/100");
    // Lien Slack mrkdwn absolu vers l'action.
    expect(txt).toContain(`<${BASE}/projects/p1|Risque critique — Refonte e-commerce>`);
    expect(txt).toContain(`<${BASE}/projects/p1/planning|`);
    expect(txt.split("\n").filter((l) => l.startsWith("🔴") || l.startsWith("🟠"))).toHaveLength(2);
  });

  it("gère un portefeuille sans élément (tout vert)", () => {
    const txt = renderSlackText(
      briefing({ items: [], counts: { critical: 0, important: 0, fyi: 0, win: 0 }, health: { score: 100, risk: "faible" } }),
      BASE,
    );
    expect(txt).toContain("Rien ne requiert votre attention");
    expect(txt).toContain(`${BASE}/dashboard`);
  });

  it("borne à 10 éléments", () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      priority: "fyi" as const,
      title: `Item ${i}`,
      detail: "x",
      actions: [{ label: "Voir", to: "/projects/p1" }],
    }));
    const txt = renderSlackText(briefing({ items: many }), BASE);
    expect(txt.split("\n").filter((l) => l.startsWith("🔵"))).toHaveLength(10);
  });
});

describe("renderTeamsCard", () => {
  it("produit une MessageCard valide avec couleur selon la priorité", () => {
    const card = renderTeamsCard(briefing(), BASE);
    expect(card["@type"]).toBe("MessageCard");
    expect(card.themeColor).toBe("D7263D"); // rouge car 1 critique
    expect(card.sections).toHaveLength(2);
    expect(card.potentialAction?.[0].targets[0].uri).toBe(`${BASE}/dashboard`);
  });

  it("passe en vert quand tout va bien", () => {
    const card = renderTeamsCard(
      briefing({ items: [], counts: { critical: 0, important: 0, fyi: 0, win: 0 } }),
      BASE,
    );
    expect(card.themeColor).toBe("22C55E");
    expect(card.sections).toHaveLength(1);
  });
});

describe("isDigestDue", () => {
  const due = { channels: ["slack"] as const, frequency: "daily" as const, hour: 8, weekday: 1, lastSentOn: null };

  it("est dû quand l'heure est atteinte et pas encore envoyé aujourd'hui", () => {
    expect(isDigestDue({ ...due, channels: ["slack"] }, new Date("2026-10-16T09:00:00Z"))).toBe(true);
  });

  it("n'est pas dû avant l'heure", () => {
    expect(isDigestDue({ ...due, channels: ["slack"] }, new Date("2026-10-16T07:59:00Z"))).toBe(false);
  });

  it("n'est pas dû si déjà envoyé aujourd'hui", () => {
    const now = new Date("2026-10-16T09:00:00Z");
    expect(isDigestDue({ ...due, channels: ["slack"], lastSentOn: isoDay(now) }, now)).toBe(false);
  });

  it("n'est pas dû sans canal actif", () => {
    expect(isDigestDue({ ...due, channels: [] }, new Date("2026-10-16T09:00:00Z"))).toBe(false);
  });

  it("n'est pas dû si désactivé", () => {
    expect(isDigestDue({ ...due, channels: ["slack"], frequency: "off" }, new Date("2026-10-16T09:00:00Z"))).toBe(false);
  });

  it("hebdomadaire : seulement le bon jour", () => {
    // 2026-10-16 est un vendredi (getUTCDay === 5).
    const now = new Date("2026-10-16T09:00:00Z");
    expect(isDigestDue({ ...due, channels: ["slack"], frequency: "weekly", weekday: 5 }, now)).toBe(true);
    expect(isDigestDue({ ...due, channels: ["slack"], frequency: "weekly", weekday: 1 }, now)).toBe(false);
  });
});
