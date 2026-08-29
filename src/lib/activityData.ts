import type { CatalogStats, SoftwareActivity } from "../types/analysis";
import { base } from "./url.js";

export interface StatsIndex {
  root: CatalogStats | null;
  byCatalog: Record<string, CatalogStats>;
}

export function resolveStats(index: StatsIndex, catalogId: string | null): CatalogStats | null {
  if (index.root) return index.root;
  return (catalogId && index.byCatalog[catalogId]) || null;
}

// Both islands on a page request the same URLs, so in-flight
// promises are shared. Failures are evicted instead of cached: a
// transient error must not pin "no data" for the page lifetime.
const inFlight = new Map<string, Promise<unknown>>();

function fetchJson<T>(url: string): Promise<T | null> {
  if (!inFlight.has(url)) {
    const request = fetch(url)
      .then((response) => (response.ok ? (response.json() as Promise<T>) : null))
      .catch(() => null)
      .then((data) => {
        if (data === null) inFlight.delete(url);
        return data;
      });
    inFlight.set(url, request);
  }
  return inFlight.get(url) as Promise<T | null>;
}

export function fetchSoftwareActivity(id: string): Promise<SoftwareActivity | null> {
  return fetchJson<{ activity: SoftwareActivity | null }>(
    `${base}/software-data/${id}.json`,
  ).then((data) => data?.activity ?? null);
}

export function fetchStatsIndex(): Promise<StatsIndex | null> {
  return fetchJson<StatsIndex>(`${base}/software-data/stats.json`);
}
