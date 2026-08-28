import type { SoftwareActivity, CatalogStats, MetricStats, StatMetric, ForgeMetric } from '../types/analysis';
import { FEATURE_OF } from './activity';

export type IssueMode = 'ratio' | 'open';
export type XmaxMode = 'max' | 'p95';

export type DimensionKey =
  | 'contributors'
  | 'history'
  | 'activity'
  | 'stars'
  | 'issues'
  | 'forks';

export interface VitalityConfig {
  weights: Record<DimensionKey, number>;
  subWeights: { phC: number; phM: number; caC: number; caM: number };
  issueMode: IssueMode;
  xmaxMode: XmaxMode;
}

export const DEFAULT_CONFIG: VitalityConfig = {
  weights: {
    contributors: 0.2,
    history: 0.15,
    activity: 0.25,
    stars: 0.15,
    issues: 0.1,
    forks: 0.15,
  },
  subWeights: { phC: 0.7, phM: 0.3, caC: 0.7, caM: 0.3 },
  issueMode: 'ratio',
  xmaxMode: 'max',
};

export const DIMENSION_ORDER: DimensionKey[] = [
  'contributors',
  'history',
  'activity',
  'stars',
  'issues',
  'forks',
];

const FORGE_METRICS: ForgeMetric[] = [
  'stars',
  'forks',
  'issuesOpen',
  'issuesClosed',
  'pullRequestsAllTime',
  'pullRequestsRecent',
];

export interface VitalityCap {
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
): number {
  return stats?.[metric]?.[field] ?? 0;
}

function refMax(stats: CatalogStats | null, metric: StatMetric, mode: XmaxMode): number {
  return statValue(stats, metric, mode === 'p95' ? 'p95' : 'max');
}

export type DimensionState = 'ok' | 'failed' | 'unknown' | 'disabled';

export interface DimensionResult {
  key: DimensionKey;
  present: boolean;
  raw: number | null;
  normalized: number | null;
  weight: number;
  contribution: number;
  approximated: boolean;
  /** Why a dimension has no value: collector error (failed), forge not
      inspected (unknown), or feature turned off on the forge (disabled). */
  state: DimensionState;
  /** Real counts behind a derived raw, so the UI can show "open/closed"
      instead of the ratio (or its worst-case sentinel). */
  rawParts?: { open: number; closed: number };
}

export interface VitalityResult {
  score100: number | null;
  dimensions: DimensionResult[];
  approximated: boolean;
  weightSum: number;
  failed: DimensionKey[];
  covered: number;
  total: number;
  cap: VitalityCap | null;
  /** Data we still mean to collect (a metric unknown or a fetch that
      failed): the score is withheld and the UI shows it as on its way. */
  pending: boolean;
  /** Weights sum past 100: the config is mid-edit, so the score is
      refused (score100 null) rather than silently renormalized. */
  overAllocated: boolean;
}

const isPresent = (v: number | null | undefined): v is number => typeof v === 'number';
const isFailed = (v: number | null | undefined): v is null => v === null;

interface CompositePart {
  value: number | null | undefined;
  sub: number;
  metric: StatMetric;
}

/**
 * A composite dimension averages its sub-metrics by their split weights.
 * Absent sub-metrics are dropped and the present ones renormalized, so a repo
 * with commits but no pull requests still scores on commits alone. With both
 * present the renormalization is a no-op (the split already sums to 1).
 */
function composite(
  parts: CompositePart[],
  stats: CatalogStats | null,
  xmaxMode: XmaxMode,
): { present: boolean; raw: number | null; normalized: number | null } {
  const present = parts.filter((p) => isPresent(p.value));
  if (present.length === 0) return { present: false, raw: null, normalized: null };

  const wSum = present.reduce((acc, p) => acc + p.sub, 0) || 1;
  const raw = present.reduce((acc, p) => acc + (p.sub / wSum) * (p.value as number), 0);
  const xmax = present.reduce((acc, p) => acc + (p.sub / wSum) * refMax(stats, p.metric, xmaxMode), 0);

  return { present: true, raw, normalized: normalize(raw, xmax) };
}

/**
 * Single-software scoring. Composite (history/activity) and issue-volume xmax
 * are approximated from per-metric catalog stats, since the true maxima of a
 * combination cannot be recovered from marginals. Simple metrics and the
 * `open` issue mode stay exact.
 */
export function computeVitality(
  activity: SoftwareActivity,
  stats: CatalogStats | null,
  config: VitalityConfig,
): VitalityResult {
  const { weights, subWeights, issueMode, xmaxMode } = config;
  const { phC, phM, caC, caM } = subWeights;

  const dims: DimensionResult[] = [];

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
    isPresent(activity.contributors)
      ? normalize(activity.contributors, refMax(stats, 'contributors', xmaxMode))
      : null,
    false,
  );

  {
    const h = composite([
      { value: activity.commitsAllTime, sub: phC, metric: 'commitsAllTime' },
      { value: activity.pullRequestsAllTime, sub: phM, metric: 'pullRequestsAllTime' },
    ], stats, xmaxMode);
    push('history', h.present, h.raw, h.normalized, true);
  }

  {
    const a = composite([
      { value: activity.commitsRecent, sub: caC, metric: 'commitsRecent' },
      { value: activity.pullRequestsRecent, sub: caM, metric: 'pullRequestsRecent' },
    ], stats, xmaxMode);
    push('activity', a.present, a.raw, a.normalized, true);
  }

  push(
    'stars',
    isPresent(activity.stars),
    activity.stars ?? null,
    isPresent(activity.stars) ? normalize(activity.stars, refMax(stats, 'stars', xmaxMode)) : null,
    false,
  );

  if (issueMode === 'open') {
    const present = isPresent(activity.issuesOpen);
    const open = activity.issuesOpen ?? 0;
    const score = present ? 1 - normalize(open, refMax(stats, 'issuesOpen', xmaxMode)) : null;
    push('issues', present, present ? open : null, score, false);
  } else {
    const present = isPresent(activity.issuesOpen) && isPresent(activity.issuesClosed);
    const open = activity.issuesOpen ?? 0;
    const closed = activity.issuesClosed ?? 0;
    // A busy tracker means an alive project, so volume is the base
    // signal. It also zeroes the never-used 0/0 tracker for free.
    const xmaxVolume = refMax(stats, 'issuesOpen', xmaxMode) + refMax(stats, 'issuesClosed', xmaxMode);
    const volume = normalize(open + closed, xmaxVolume);
    // Triage discount: full credit up to one open per two closed,
    // none when nothing was ever closed.
    const factor = open === 0 ? 1 : closed === 0 ? 0 : Math.min(1, closed / (2 * open));
    const score = present ? volume * factor : null;
    push('issues', present, present ? open + closed : null, score, true);
    if (present) dims[dims.length - 1].rawParts = { open, closed };
  }

  push(
    'forks',
    isPresent(activity.forks),
    activity.forks ?? null,
    isPresent(activity.forks) ? normalize(activity.forks, refMax(stats, 'forks', xmaxMode)) : null,
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
      d.state = feature && disabledFeatures.includes(feature as (typeof disabledFeatures)[number]) ? 'disabled' : 'unknown';
    }
  }

  // A metric we still mean to collect (never fetched, or the fetch
  // failed) withholds the score entirely: a partial number would read
  // as a low grade. Known n/a is real evidence, so it only bounds the
  // claim (the SSL Labs model).
  const pending = failed.length > 0 || hasUnknown;
  const cap: VitalityCap | null =
    !pending && hasDisabled ? { limit: 89, reason: 'disabled' } : null;

  const overAllocated = freeWeightPoints(weights) < 0;
  const score100 =
    pending || overAllocated
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
    overAllocated,
  };
}
