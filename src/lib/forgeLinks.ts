import type { ForgeMetric } from "../types/analysis";

type ForgeKind = "github" | "gitlab" | "gitea";

// Hosts the collector autodetects as Gitea or Forgejo. Everything else
// with forge metrics speaks the GitLab API, which is also the default
// absoluteUrl.js assumes for raw files.
const GITEA_HOSTS = new Set(["codeberg.org", "platform.sunet.se"]);
const NO_FORGE_HOSTS = new Set(["bitbucket.org"]);
const MIRROR_HOSTS = new Set(["gitlab.opencode.de"]);

function parseRepo(raw: string | null | undefined): URL | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    u.pathname = u.pathname.replace(/\/+$/, "").replace(/\.git$/, "");
    u.search = "";
    u.hash = "";
    return u;
  } catch {
    return null;
  }
}

// Mirrors the collector's forge_target: an opencode.de mirror takes
// its forge metrics from the repository publiccode.yml declares, when
// that is a repository (owner/name path) on another host.
export function forgeRepoUrl(crawledUrl: string | null | undefined, declaredUrl: string | null | undefined): string | null {
  const crawled = parseRepo(crawledUrl);
  if (!crawled) return null;
  if (!MIRROR_HOSTS.has(crawled.host)) return crawled.toString();
  const declared = parseRepo(declaredUrl);
  if (declared && declared.host !== crawled.host && declared.pathname.slice(1).includes("/")) {
    return declared.toString();
  }
  return crawled.toString();
}

function forgeKind(host: string): ForgeKind | null {
  if (host === "github.com") return "github";
  if (NO_FORGE_HOSTS.has(host)) return null;
  if (GITEA_HOSTS.has(host)) return "gitea";
  return "gitlab";
}

// Star lists (stargazers, starrers) sit behind a login on some hosts,
// so stars point at the repo home with a text fragment on the count.
// The github forks page hides inactive forks unless asked not to.
const PATHS: Record<ForgeKind, Record<ForgeMetric, string>> = {
  github: {
    stars: "#:~:text=stars",
    forks: "/forks?include=active%2Cinactive&page=1&period=&sort_by=stargazer_counts",
    issuesOpen: "/issues?q=is%3Aissue+is%3Aopen",
    issuesClosed: "/issues?q=is%3Aissue+is%3Aclosed",
    pullRequestsAllTime: "/pulls?q=is%3Apr",
    pullRequestsRecent: "/pulls?q=is%3Apr+sort%3Acreated-desc",
  },
  gitlab: {
    stars: "#:~:text=stars",
    forks: "/-/forks",
    issuesOpen: "/-/issues/?state=opened",
    issuesClosed: "/-/issues/?state=closed",
    pullRequestsAllTime: "/-/merge_requests?state=all",
    pullRequestsRecent: "/-/merge_requests?state=all&sort=created_date",
  },
  gitea: {
    stars: "#:~:text=stars",
    forks: "/forks",
    issuesOpen: "/issues?state=open",
    issuesClosed: "/issues?state=closed",
    pullRequestsAllTime: "/pulls?state=all",
    pullRequestsRecent: "/pulls?state=all&sort=newest",
  },
};

export function forgeMetricUrl(repoUrl: string | null | undefined, metric: ForgeMetric): string | null {
  const repo = parseRepo(repoUrl);
  if (!repo) return null;
  const kind = forgeKind(repo.host);
  if (!kind) return null;
  return repo.toString() + PATHS[kind][metric];
}
