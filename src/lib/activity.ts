import type { SoftwareActivity, CatalogActivity, ForgeMetric } from '../types/analysis';

const SUPPORTED_VERSION = 1;

export function parseSoftwareActivity(analysis: unknown): SoftwareActivity | null {
  const activity = (analysis as { activity?: SoftwareActivity } | null)?.activity;
  if (!activity || activity.v !== SUPPORTED_VERSION) return null;
  return activity;
}

// The collector writes updatedAt only on the catalog aggregate. A
// software activity carries the t the catalog API adds when it stores
// the namespace, and that t stays put while the metrics do not change.
export function collectedAt(activity: SoftwareActivity): string | undefined {
  return activity.t ?? activity.updatedAt;
}

export function parseCatalogActivity(analysis: unknown): CatalogActivity | null {
  const activity = (analysis as { activity?: CatalogActivity } | null)?.activity;
  if (!activity || activity.v !== SUPPORTED_VERSION) return null;
  const { v, updatedAt, softwareCount, recentDays, stats } = activity;
  return { v, updatedAt, softwareCount, recentDays, stats: stats ?? {} };
}

// A single-item catalog compares the item against itself: every
// stat max equals the item's own value and the score is a constant
// 100. Reference stats need at least two items to mean anything.
export function usableStats(
  activity: CatalogActivity | null,
): CatalogActivity['stats'] | null {
  if (!activity || activity.softwareCount <= 1) return null;
  return activity.stats;
}

export function statsByCatalog(
  catalogAnalysis: Iterable<[string, CatalogActivity | null]>,
): Record<string, CatalogActivity['stats']> {
  const out: Record<string, CatalogActivity['stats']> = {};
  for (const [id, activity] of catalogAnalysis) {
    const stats = usableStats(activity);
    if (stats) out[id] = stats;
  }
  return out;
}

export type FieldState =
  | { state: 'disabled' }
  | { state: 'unsupported' }
  | { state: 'unknown' }
  | { state: 'unavailable' }
  | { state: 'value'; value: number };

export const FEATURE_OF: Record<ForgeMetric, string> = {
  stars: 'stars',
  forks: 'forks',
  issuesOpen: 'issues',
  issuesClosed: 'issues',
  pullRequestsAllTime: 'pullRequests',
  pullRequestsRecent: 'pullRequests',
};

export const FORGE_METRICS = Object.keys(FEATURE_OF) as ForgeMetric[];

/** The collector writes stars, forks and pull requests for every forge
    it reads, as null when the fetch fails. A document with no forge
    field at all comes from a forge it cannot read (the
    forge-unsupported fixture of the analysis contract), so those
    metrics are not coming on a later run. */
export function forgeUnsupported(activity: SoftwareActivity): boolean {
  return FORGE_METRICS.every((m) => !(m in activity));
}

export function fieldState(activity: SoftwareActivity, key: ForgeMetric): FieldState {
  if (!(key in activity)) {
    if ((activity.disabled ?? []).includes(FEATURE_OF[key])) return { state: 'disabled' };
    return forgeUnsupported(activity) ? { state: 'unsupported' } : { state: 'unknown' };
  }
  const value = activity[key];
  if (value === null) return { state: 'unavailable' };
  if (typeof value === 'number') return { state: 'value', value };
  return { state: 'unknown' };
}
