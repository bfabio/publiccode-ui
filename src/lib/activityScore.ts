import type { SoftwareActivity, CatalogStats, MetricStats, StatMetric } from '../types/analysis';
import { FEATURE_OF, FORGE_METRICS, forgeUnsupported } from './activity';

/** 'open' is the overall-issues mode: plain open+closed volume with no
    triage discount. The key predates the rename and survives in stored
    configs and shared URLs. */
export type IssueMode = 'ratio' | 'open';
export type XmaxMode = 'max' | 'p95';

export type DimensionKey =
  | 'contributors'
  | 'history'
  | 'activity'
  | 'stars'
  | 'issues'
  | 'forks';

export interface ActivityConfig {
  weights: Record<DimensionKey, number>;
  subWeights: { phC: number; phM: number; caC: number; caM: number };
  issueMode: IssueMode;
  xmaxMode: XmaxMode;
}

export const DEFAULT_CONFIG: ActivityConfig = {
  weights: {
    contributors: 0.2,
    history: 0.15,
    activity: 0.32,
    stars: 0.06,
    issues: 0.15,
    forks: 0.12,
  },
  subWeights: { phC: 0.3, phM: 0.7, caC: 0.3, caM: 0.7 },
  issueMode: 'ratio',
  xmaxMode: 'p95',
};

export const DIMENSION_ORDER: DimensionKey[] = [
  'contributors',
  'history',
  'activity',
  'stars',
  'issues',
  'forks',
];

export interface ActivityScoreCap {
  limit: 89;
  reason: 'disabled';
}

/**
 * Weight editing follows a points-pool model: lowering a dimension frees
 * points instead of rescaling the other five. Any weight can be set up
 * to 100 on its own, so the pool can go NEGATIVE (over-allocation is
 * allowed on purpose: type 80 first, lower something else after) and
 * the UI warns until it is back to zero. While the pool is negative
 * the score is withheld rather than renormalized. Works in integer
 * hundredths so values stay clean to two decimals.
 */
export function freeWeightPoints(weights: Record<DimensionKey, number>): number {
  const used = DIMENSION_ORDER.reduce((acc, k) => acc + Math.round(weights[k] * 100), 0);
  return 100 - used;
}

export function allocateWeight(
  weights: Record<DimensionKey, number>,
  key: DimensionKey,
  value: number,
): Record<DimensionKey, number> {
  const next = Math.max(0, Math.min(100, Math.round(value * 100)));
  return { ...weights, [key]: next / 100 };
}

export function normalize(x: number, xmax: number): number {
  if (xmax <= 0) return 0;
  const n = Math.log(1 + x) / Math.log(1 + xmax);
  return Math.max(0, Math.min(1, n));
}

function statValue(
  stats: CatalogStats | null,
  metric: StatMetric,
  field: keyof MetricStats,
): number | null {
  const value = stats?.[metric]?.[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** The catalog reference for a metric, or null when the catalog has no
    stat for it. Missing is not zero: a zero reference grades every
    count as 0, and the issue dimension would read that as evidence. */
function refMax(stats: CatalogStats | null, metric: StatMetric, mode: XmaxMode): number | null {
  return statValue(stats, metric, mode === 'p95' ? 'p95' : 'max');
}

export type DimensionState = 'ok' | 'failed' | 'unknown' | 'disabled' | 'unsupported';

export interface DimensionResult {
  key: DimensionKey;
  present: boolean;
  raw: number | null;
  normalized: number | null;
  weight: number;
  contribution: number;
  approximated: boolean;
  /** Why a dimension has no value: collector error (failed), forge not
      inspected (unknown), feature turned off on the forge (disabled), or
      a forge the collector cannot read (unsupported). */
  state: DimensionState;
  /** Real counts behind a derived raw, so the UI can show "open/closed"
      or "commits/pull requests" instead of the total. */
  rawParts?: { open: number; closed: number } | { commits: number; pullRequests: number };
}

export interface ActivityScoreResult {
  score100: number | null;
  dimensions: DimensionResult[];
  approximated: boolean;
  weightSum: number;
  failed: DimensionKey[];
  covered: number;
  total: number;
  cap: ActivityScoreCap | null;
  /** Data we still mean to collect (a metric unknown or a fetch that
      failed): the score is withheld and the UI shows it as on its way. */
  pending: boolean;
  /** No forge metric at all: the forge is one the collector cannot
      read, so the score is withheld without promising it. */
  forgeUnsupported: boolean;
  /** Weights sum past 100: the config is mid-edit, so the score is
      refused (score100 null) rather than silently renormalized. */
  overAllocated: boolean;
  /** Metrics the software has a value for but the catalog stats do not
      cover. They cannot be graded, so they also make the score pending. */
  unreferenced: StatMetric[];
}

const isPresent = (v: number | null | undefined): v is number => typeof v === 'number';
const isFailed = (v: number | null | undefined): v is null => v === null;

interface CompositePart {
  value: number | null | undefined;
  sub: number;
  metric: StatMetric;
}

interface CompositeResult {
  present: boolean;
  raw: number | null;
  normalized: number | null;
  rawParts?: { commits: number; pullRequests: number };
}

/**
 * A composite dimension blends the levels of its two sub-metrics by the
 * split weights, each level normalized against that metric's own catalog
 * stat. Blending the raw counts instead lets commits swamp pull requests,
 * since the catalog has about ten times more commits than pull requests,
 * and the split then changes nothing visible. An absent sub-metric is
 * dropped and the other takes the whole split, so a repo with commits but
 * no pull requests still scores on commits alone.
 */
function composite(
  commits: CompositePart,
  pullRequests: CompositePart,
  stats: CatalogStats | null,
  xmaxMode: XmaxMode,
  unreferenced: StatMetric[],
): CompositeResult {
  const present = [commits, pullRequests].filter((p) => isPresent(p.value));
  if (present.length === 0) return { present: false, raw: null, normalized: null };

  // A sub-metric without a catalog reference is left out of the blend
  // like an absent one, and reported so the score is withheld.
  const graded = present.flatMap((p) => {
    const xmax = refMax(stats, p.metric, xmaxMode);
    if (xmax === null) {
      unreferenced.push(p.metric);
      return [];
    }
    return [{ ...p, xmax }];
  });
  const wSum = graded.reduce((acc, p) => acc + p.sub, 0) || 1;
  const normalized =
    graded.length === 0
      ? null
      : graded.reduce((acc, p) => acc + (p.sub / wSum) * normalize(p.value as number, p.xmax), 0);
  const raw = present.reduce((acc, p) => acc + (p.value as number), 0);
  const rawParts =
    isPresent(commits.value) && isPresent(pullRequests.value)
      ? { commits: commits.value, pullRequests: pullRequests.value }
      : undefined;

  return { present: true, raw, normalized, rawParts };
}

/**
 * Single-software scoring. Every metric normalizes against its own catalog
 * stat, exact. The one approximation is the issue-volume xmax, summed from
 * the open and closed maxima because the true maximum of the sum cannot be
 * recovered from the marginals.
 */
export function computeActivityScore(
  activity: SoftwareActivity,
  stats: CatalogStats | null,
  config: ActivityConfig,
): ActivityScoreResult {
  const { weights, subWeights, issueMode, xmaxMode } = config;
  const { phC, phM, caC, caM } = subWeights;

  const dims: DimensionResult[] = [];
  const unreferenced: StatMetric[] = [];

  const grade = (value: number, metric: StatMetric): number | null => {
    const xmax = refMax(stats, metric, xmaxMode);
    if (xmax === null) {
      unreferenced.push(metric);
      return null;
    }
    return normalize(value, xmax);
  };

  const push = (
    key: DimensionKey,
    present: boolean,
    raw: number | null,
    normalized: number | null,
    approximated: boolean,
  ) => {
    dims.push({ key, present, raw, normalized, weight: weights[key], contribution: 0, approximated, state: 'ok' });
  };

  push(
    'contributors',
    isPresent(activity.contributors),
    activity.contributors ?? null,
    isPresent(activity.contributors) ? grade(activity.contributors, 'contributors') : null,
    false,
  );

  {
    const h = composite(
      { value: activity.commitsAllTime, sub: phC, metric: 'commitsAllTime' },
      { value: activity.pullRequestsAllTime, sub: phM, metric: 'pullRequestsAllTime' },
      stats, xmaxMode, unreferenced,
    );
    push('history', h.present, h.raw, h.normalized, false);
    if (h.rawParts) dims[dims.length - 1].rawParts = h.rawParts;
  }

  {
    const a = composite(
      { value: activity.commitsRecent, sub: caC, metric: 'commitsRecent' },
      { value: activity.pullRequestsRecent, sub: caM, metric: 'pullRequestsRecent' },
      stats, xmaxMode, unreferenced,
    );
    push('activity', a.present, a.raw, a.normalized, false);
    if (a.rawParts) dims[dims.length - 1].rawParts = a.rawParts;
  }

  push(
    'stars',
    isPresent(activity.stars),
    activity.stars ?? null,
    isPresent(activity.stars) ? grade(activity.stars, 'stars') : null,
    false,
  );

  {
    const present = isPresent(activity.issuesOpen) && isPresent(activity.issuesClosed);
    const open = activity.issuesOpen ?? 0;
    const closed = activity.issuesClosed ?? 0;
    // A busy tracker means an alive project, so volume is the base
    // signal. It also zeroes the never-used 0/0 tracker for free.
    const xmaxOpen = refMax(stats, 'issuesOpen', xmaxMode);
    const xmaxClosed = refMax(stats, 'issuesClosed', xmaxMode);
    if (present && xmaxOpen === null) unreferenced.push('issuesOpen');
    if (present && xmaxClosed === null) unreferenced.push('issuesClosed');
    const volume =
      xmaxOpen === null || xmaxClosed === null ? null : normalize(open + closed, xmaxOpen + xmaxClosed);
    // Triage discount, ratio mode only: full credit up to one open per
    // two closed, none when nothing was ever closed.
    const factor =
      issueMode === 'ratio'
        ? open === 0 ? 1 : closed === 0 ? 0 : Math.min(1, closed / (2 * open))
        : 1;
    const score = present && volume !== null ? volume * factor : null;
    push('issues', present, present ? open + closed : null, score, true);
    if (present) dims[dims.length - 1].rawParts = { open, closed };
  }

  push(
    'forks',
    isPresent(activity.forks),
    activity.forks ?? null,
    isPresent(activity.forks) ? grade(activity.forks, 'forks') : null,
    false,
  );

  const ordered = DIMENSION_ORDER.map((k) => dims.find((d) => d.key === k)!);

  const presentDims = ordered.filter((d) => d.present && d.normalized !== null);
  const sumW = presentDims.reduce((acc, d) => acc + d.weight, 0);

  for (const d of presentDims) {
    d.contribution = sumW > 0 ? (100 * d.weight * (d.normalized as number)) / sumW : 0;
  }

  // A null anywhere means the collector failed, so trust nothing:
  // even a field the current issueMode ignores suppresses the score.
  const failed = (
    [
      ['history', isFailed(activity.pullRequestsAllTime)],
      ['activity', isFailed(activity.pullRequestsRecent)],
      ['stars', isFailed(activity.stars)],
      ['issues', isFailed(activity.issuesOpen) || isFailed(activity.issuesClosed)],
      ['forks', isFailed(activity.forks)],
    ] as [DimensionKey, boolean][]
  )
    .filter(([, f]) => f)
    .map(([k]) => k);

  const disabledFeatures = activity.disabled ?? [];
  const unsupported = forgeUnsupported(activity);
  const missing = FORGE_METRICS.filter((m) => !(m in activity));
  const hasUnknown = missing.some((m) => !disabledFeatures.includes(FEATURE_OF[m]));
  const hasDisabled = missing.some((m) => disabledFeatures.includes(FEATURE_OF[m]));

  const FEATURE_OF_DIM: Partial<Record<DimensionKey, string>> = {
    stars: 'stars', forks: 'forks', issues: 'issues', history: 'pullRequests', activity: 'pullRequests',
  };
  for (const d of ordered) {
    if (failed.includes(d.key)) d.state = 'failed';
    else if (d.present) d.state = 'ok';
    else {
      const feature = FEATURE_OF_DIM[d.key];
      d.state = !feature ? 'unknown'
        : disabledFeatures.includes(feature as (typeof disabledFeatures)[number]) ? 'disabled'
        : unsupported ? 'unsupported'
        : 'unknown';
    }
  }

  // A metric we still mean to collect (never fetched, or the fetch
  // failed) withholds the score entirely: a partial number would read
  // as a low grade. Known n/a is real evidence, so it only bounds the
  // claim (the SSL Labs model). Unsupported forge metrics will never
  // arrive, so they do not make the score pending. Missing catalog
  // references still withhold grading until the stats are available.
  const pending = failed.length > 0 || (hasUnknown && !unsupported) || unreferenced.length > 0;
  const cap: ActivityScoreCap | null =
    !pending && hasDisabled ? { limit: 89, reason: 'disabled' } : null;

  const overAllocated = freeWeightPoints(weights) < 0;
  const score100 =
    pending || unsupported || overAllocated
      ? null
      : Math.min(
          presentDims.reduce((acc, d) => acc + d.contribution, 0),
          cap?.limit ?? 100,
        );
  const weightSum = DIMENSION_ORDER.reduce((acc, k) => acc + weights[k], 0);
  const approximated = presentDims.some((d) => d.approximated);

  return {
    score100,
    dimensions: ordered,
    approximated,
    weightSum,
    failed,
    covered: presentDims.length,
    total: DIMENSION_ORDER.length,
    cap,
    pending,
    forgeUnsupported: unsupported,
    overAllocated,
    unreferenced,
  };
}
