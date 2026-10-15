import { describe, expect, it } from "vitest";
import { mapGitlab } from "./gitlab.js";
import { mapJira } from "./jira.js";
import { mapLinear } from "./linear.js";
import { mapConfluence } from "./confluence.js";
import { mapNotion } from "./notion.js";

describe("mapGitlab (données simulées)", () => {
  it("convertit commits / MR / issues en signaux gitlab", () => {
    const signals = mapGitlab("p1", {
      commits: [{ id: "abc", created_at: "2026-10-01T00:00:00Z", title: "fix", author_name: "Alice" }],
      mergeRequests: [{ iid: 5, title: "Feature", state: "opened", created_at: "2026-10-02T00:00:00Z", author: { username: "bob" } }],
      issues: [{ iid: 9, title: "Bug", state: "opened", created_at: "2026-10-03T00:00:00Z", author: null }],
    });
    expect(signals).toHaveLength(3);
    expect(signals.map((s) => s.type)).toEqual(["commit", "pull_request", "issue"]);
    expect(signals.every((s) => s.source === "gitlab")).toBe(true);
    expect(signals[0].actor).toBe("Alice");
    expect(signals[1].payload).toMatchObject({ number: 5, state: "opened" });
    expect(signals[2].actor).toBeNull();
  });
});

describe("mapJira (données simulées)", () => {
  it("convertit les issues Jira en signaux issue", () => {
    const signals = mapJira("p1", [
      { key: "ABC-1", fields: { summary: "Login cassé", status: { name: "To Do" }, created: "2026-10-01T00:00:00Z", creator: { displayName: "Alice" } } },
      { key: "ABC-2", fields: { summary: "Perf", status: null, created: "2026-10-02T00:00:00Z", creator: null } },
    ]);
    expect(signals).toHaveLength(2);
    expect(signals.every((s) => s.source === "jira" && s.type === "issue")).toBe(true);
    expect(signals[0].payload).toMatchObject({ key: "ABC-1", state: "To Do" });
    expect(signals[1].payload).toMatchObject({ state: "unknown" });
    expect(signals[0].actor).toBe("Alice");
  });
});

describe("mapLinear (données simulées)", () => {
  it("convertit les issues Linear en signaux issue", () => {
    const signals = mapLinear("p1", [
      { identifier: "ENG-1", title: "Crash", createdAt: "2026-10-01T00:00:00Z", state: { name: "Todo" }, creator: { name: "Bob" } },
    ]);
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({ source: "linear", type: "issue", actor: "Bob" });
    expect(signals[0].payload).toMatchObject({ key: "ENG-1", state: "Todo" });
  });
});

describe("mapConfluence (données simulées)", () => {
  it("convertit les pages Confluence en signaux document", () => {
    const signals = mapConfluence("p1", [
      {
        id: "123",
        title: "Spécifications v2",
        version: { when: "2026-10-05T00:00:00Z", by: { displayName: "Alice" } },
        history: { createdDate: "2026-09-01T00:00:00Z", createdBy: { displayName: "Bob" } },
      },
      { id: "456", title: "Note sans version" },
    ]);
    expect(signals).toHaveLength(2);
    expect(signals.every((s) => s.source === "confluence" && s.type === "document")).toBe(true);
    expect(signals[0]).toMatchObject({ actor: "Alice" });
    expect(signals[0].payload).toMatchObject({ key: "123", title: "Spécifications v2" });
    expect(signals[0].occurredAt).toEqual(new Date("2026-10-05T00:00:00Z"));
    // Sans version ni historique : acteur null, date par défaut (non nulle).
    expect(signals[1].actor).toBeNull();
    expect(signals[1].occurredAt).toBeInstanceOf(Date);
  });
});

describe("mapNotion (données simulées)", () => {
  it("convertit les pages Notion en signaux document et extrait le titre", () => {
    const signals = mapNotion("p1", [
      {
        id: "page-1",
        last_edited_time: "2026-10-06T00:00:00Z",
        created_time: "2026-10-01T00:00:00Z",
        properties: {
          Name: { type: "title", title: [{ plain_text: "Feuille " }, { plain_text: "de route" }] },
          Statut: { type: "select" },
        },
      },
      { id: "page-2", last_edited_time: "2026-10-02T00:00:00Z", properties: {} },
    ]);
    expect(signals).toHaveLength(2);
    expect(signals.every((s) => s.source === "notion" && s.type === "document")).toBe(true);
    expect(signals[0].payload).toMatchObject({ key: "page-1", title: "Feuille de route" });
    expect(signals[0].occurredAt).toEqual(new Date("2026-10-06T00:00:00Z"));
    // Pas de propriété title → libellé de repli.
    expect(signals[1].payload).toMatchObject({ title: "(sans titre)" });
  });
});
