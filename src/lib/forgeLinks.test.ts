import { describe, expect, it } from "vitest";
import { forgeMetricUrl, forgeRepoUrl } from "./forgeLinks";

describe("forgeRepoUrl", () => {
  it("uses the crawled repository by default", () => {
    expect(forgeRepoUrl("https://github.com/a/b.git", "https://github.com/a/b")).toBe("https://github.com/a/b");
  });

  it("follows the declared home of an opencode mirror", () => {
    expect(forgeRepoUrl("https://gitlab.opencode.de/x/y.git", "https://github.com/a/b")).toBe("https://github.com/a/b");
  });

  it("keeps the mirror when the declared url is a homepage", () => {
    expect(forgeRepoUrl("https://gitlab.opencode.de/x/y.git", "https://example.org/")).toBe("https://gitlab.opencode.de/x/y");
  });

  it("keeps the mirror when nothing is declared", () => {
    expect(forgeRepoUrl("https://gitlab.opencode.de/x/y.git", undefined)).toBe("https://gitlab.opencode.de/x/y");
  });

  it("returns null without a usable url", () => {
    expect(forgeRepoUrl(null, null)).toBeNull();
    expect(forgeRepoUrl("not a url", null)).toBeNull();
  });
});

describe("forgeMetricUrl", () => {
  const gh = "https://github.com/a/b";
  it("maps github metrics to their pages", () => {
    expect(forgeMetricUrl(gh, "stars")).toBe(`${gh}#:~:text=stars`);
    expect(forgeMetricUrl(gh, "forks")).toBe(`${gh}/forks?include=active%2Cinactive&page=1&period=&sort_by=stargazer_counts`);
    expect(forgeMetricUrl(gh, "issuesOpen")).toBe(`${gh}/issues?q=is%3Aissue+is%3Aopen`);
    expect(forgeMetricUrl(gh, "issuesClosed")).toBe(`${gh}/issues?q=is%3Aissue+is%3Aclosed`);
    expect(forgeMetricUrl(gh, "pullRequestsAllTime")).toBe(`${gh}/pulls?q=is%3Apr`);
    expect(forgeMetricUrl(gh, "pullRequestsRecent")).toBe(`${gh}/pulls?q=is%3Apr+sort%3Acreated-desc`);
  });

  it("maps gitlab metrics, any gitlab host", () => {
    const gl = "https://gitlab.opencode.de/g/sub/p";
    expect(forgeMetricUrl(gl, "stars")).toBe(`${gl}#:~:text=stars`);
    expect(forgeMetricUrl(gl, "forks")).toBe(`${gl}/-/forks`);
    expect(forgeMetricUrl(gl, "issuesOpen")).toBe(`${gl}/-/issues/?state=opened`);
    expect(forgeMetricUrl(gl, "issuesClosed")).toBe(`${gl}/-/issues/?state=closed`);
    expect(forgeMetricUrl(gl, "pullRequestsAllTime")).toBe(`${gl}/-/merge_requests?state=all`);
    expect(forgeMetricUrl(gl, "pullRequestsRecent")).toBe(`${gl}/-/merge_requests?state=all&sort=created_date`);
  });

  it("maps gitea hosts", () => {
    const gt = "https://codeberg.org/o/r";
    expect(forgeMetricUrl(gt, "stars")).toBe(`${gt}#:~:text=stars`);
    expect(forgeMetricUrl(gt, "forks")).toBe(`${gt}/forks`);
    expect(forgeMetricUrl(gt, "issuesOpen")).toBe(`${gt}/issues?state=open`);
    expect(forgeMetricUrl(gt, "issuesClosed")).toBe(`${gt}/issues?state=closed`);
    expect(forgeMetricUrl(gt, "pullRequestsAllTime")).toBe(`${gt}/pulls?state=all`);
    expect(forgeMetricUrl(gt, "pullRequestsRecent")).toBe(`${gt}/pulls?state=all&sort=newest`);
  });

  it("has no link for a host without a forge api", () => {
    expect(forgeMetricUrl("https://bitbucket.org/o/r", "stars")).toBeNull();
    expect(forgeMetricUrl(null, "stars")).toBeNull();
  });
});
