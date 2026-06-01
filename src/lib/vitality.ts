import type { SoftwareActivity, CatalogStats, MetricStats, StatMetric } from '../types/analysis';

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

/**
 * Set one dimension weight and rescale the other five so the six always
 * sum to exactly 1. Works in integer hundredths with the largest-remainder
 * method, so results stay non-negative, clean to two decimals, and exact.
 */
export function rebalanceWeights(
  weights: Record<DimensionKey, number>,
  key: DimensionKey,
  value: number,
): Record<DimensionKey, number> {
  const editedBp = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const others = DIMENSION_ORDER.filter((k) => k !== key);
  const remaining = 100 - editedBp;
  const currentSum = others.reduce((acc, k) => acc + weights[k], 0);

  const ideal = others.map((k) =>
    currentSum > 0 ? (weights[k] / currentSum) * remaining : remaining / others.length,
  );
  const bp = ideal.map((x) => Math.floor(x));
  let leftover = remaining - bp.reduce((acc, x) => acc + x, 0);

  const byFraction = ideal
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of byFraction) {
    if (leftover <= 0) break;
    bp[i] += 1;
    leftover -= 1;
  }

  const next = { ...weights, [key]: editedBp / 100 };
  others.forEach((k, i) => {
    next[k] = bp[i] / 100;
  });
  return next;
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

export interface DimensionResult {
  key: DimensionKey;
  present: boolean;
  raw: number | null;
  normalized: number | null;
  weight: number;
  contribution: number;
  approximated: boolean;
}

export interface VitalityResult {
  score100: number;
  dimensions: DimensionResult[];
  approximated: boolean;
  weightSum: number;
}

const isPresent = (v: number | null | undefined): v is number => typeof v === 'number';

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
 * Single-software scoring. Composite (history/activity) and ratio-issue xmax
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
    dims.push({ key, present, raw, normalized, weight: weights[key], contribution: 0, approximated });
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
    const xmaxRatio = refMax(stats, 'issuesOpen', xmaxMode) / Math.max(1, statValue(stats, 'issuesClosed', 'min'));
    const ratio = closed === 0 ? (open > 0 ? xmaxRatio : 0) : open / closed;
    const score = present ? 1 - normalize(ratio, xmaxRatio) : null;
    push('issues', present, present ? ratio : null, score, true);
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

  const score100 = presentDims.reduce((acc, d) => acc + d.contribution, 0);
  const weightSum = DIMENSION_ORDER.reduce((acc, k) => acc + weights[k], 0);
  const approximated = presentDims.some((d) => d.approximated);

  return { score100, dimensions: ordered, approximated, weightSum };
}
