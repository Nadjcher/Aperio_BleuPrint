import { describe, expect, it } from "vitest";
import { mapImportedBlock } from "./portfolioImport.js";

describe("mapImportedBlock", () => {
  it("GitHub : numéro + URL issue/PR depuis settings.repo", () => {
    const issue = mapImportedBlock("github", { repo: "octo/app" }, {
      type: "issue",
      payload: { number: 42, title: "Bug login" },
    });
    expect(issue).toMatchObject({
      sourceRef: "42",
      type: "issue",
      sourceUrl: "https://github.com/octo/app/issues/42",
      targetDate: null,
    });
    const pr = mapImportedBlock("github", { repo: "octo/app" }, {
      type: "pull_request",
      payload: { number: 7, title: "Feature" },
    });
    expect(pr?.sourceUrl).toBe("https://github.com/octo/app/pull/7");
    expect(pr?.type).toBe("PR");
  });

  it("Jira : clé + duedate → dateCible + URL browse", () => {
    const r = mapImportedBlock(
      "jira",
      { host: "https://acme.atlassian.net/" },
      { type: "issue", payload: { key: "ABC-12", title: "Migration", due: "2026-11-30" } },
    );
    expect(r).toMatchObject({
      sourceRef: "ABC-12",
      targetDate: "2026-11-30",
      sourceUrl: "https://acme.atlassian.net/browse/ABC-12",
    });
  });

  it("GitLab : iid + URL issues/merge_requests", () => {
    const mr = mapImportedBlock(
      "gitlab",
      { host: "https://gitlab.com", projectId: "group/app" },
      { type: "pull_request", payload: { number: 9, title: "MR" } },
    );
    expect(mr?.sourceUrl).toBe("https://gitlab.com/group/app/-/merge_requests/9");
  });

  it("Linear : pas d'URL directe mais brique valide", () => {
    const r = mapImportedBlock("linear", {}, {
      type: "issue",
      payload: { key: "ENG-1", title: "Crash" },
    });
    expect(r).toMatchObject({ sourceRef: "ENG-1", sourceUrl: null });
  });

  it("null si aucun identifiant", () => {
    expect(mapImportedBlock("github", { repo: "o/a" }, { type: "issue", payload: {} })).toBeNull();
  });
});
