import { describe, it, expect } from 'vitest';
import { computeVitality, DEFAULT_CONFIG } from './vitality.ts';
import type { SoftwareActivity, CatalogStats } from '../types/analysis';

const stats: CatalogStats = {
  contributors: { max: 1247, min: 1, count: 302, mean: 25.8, median: 4, p95: 101 },
  commitsAllTime: { max: 107641, min: 1, count: 302, mean: 2291, median: 44, p95: 10917 },
  commitsRecent: { max: 7268, min: 0, count: 302, mean: 120.5, median: 2, p95: 528 },
};

describe('computeVitality with missing pull requests', () => {
  const activity = {
    v: 1, tags: 74, recentDays: 180, contributors: 30,
    commitsAllTime: 4194, commitsRecent: 485,
  } as SoftwareActivity;

  const result = computeVitality(activity, stats, DEFAULT_CONFIG);

  it('produces a finite, positive score', () => {
    expect(Number.isNaN(result.score100)).toBe(false);
    expect(result.score100).toBeGreaterThan(0);
  });

  it('keeps the composite dimensions present using commits alone', () => {
    const history = result.dimensions.find((d) => d.key === 'history')!;
    const current = result.dimensions.find((d) => d.key === 'activity')!;
    expect(history.present).toBe(true);
    expect(Number.isNaN(history.normalized as number)).toBe(false);
    expect(current.present).toBe(true);
    expect(Number.isNaN(current.normalized as number)).toBe(false);
  });
});

describe('computeVitality with no commit or pull request data', () => {
  it('excludes the composite dimensions and stays finite', () => {
    const activity = { v: 1, tags: 0, recentDays: 180, contributors: 5 } as SoftwareActivity;
    const result = computeVitality(activity, stats, DEFAULT_CONFIG);
    const history = result.dimensions.find((d) => d.key === 'history')!;
    expect(history.present).toBe(false);
    expect(Number.isNaN(result.score100)).toBe(false);
  });
});

describe('computeVitality with a failed forge fetch', () => {
  it('suppresses the score and lists the failed dimensions', () => {
    const activity = {
      v: 1, tags: 74, recentDays: 180, contributors: 30,
      commitsAllTime: 4194, commitsRecent: 485,
      stars: null,
    } as SoftwareActivity;
    const result = computeVitality(activity, stats, DEFAULT_CONFIG);
    expect(result.score100).toBeNull();
    expect(result.failed).toEqual(['stars']);
  });

  it('counts a null issue field as failed even in open mode', () => {
    const activity = {
      v: 1, tags: 74, recentDays: 180, contributors: 30,
      commitsAllTime: 4194, commitsRecent: 485,
      issuesOpen: 3, issuesClosed: null,
    } as SoftwareActivity;
    const result = computeVitality(activity, stats, {
      ...DEFAULT_CONFIG,
      issueMode: 'open',
    });
    expect(result.score100).toBeNull();
    expect(result.failed).toEqual(['issues']);
  });
});

describe('computeVitality with absent forge metrics', () => {
  it('scores what is present and reports the coverage', () => {
    const activity = {
      v: 1, tags: 74, recentDays: 180, contributors: 30,
      commitsAllTime: 4194, commitsRecent: 485,
    } as SoftwareActivity;
    const result = computeVitality(activity, stats, DEFAULT_CONFIG);
    expect(result.score100).not.toBeNull();
    expect(result.failed).toEqual([]);
    expect(result.covered).toBe(3);
    expect(result.total).toBe(6);
    expect(result.cap).toEqual({ limit: 79, reason: 'unknown' });
  });
});

describe('computeVitality caps on incomplete evidence', () => {
  const s = (max: number) => ({ max, min: 0, count: 10, mean: max / 2, median: max / 2, p95: max });
  const richStats: CatalogStats = {
    contributors: s(30), commitsAllTime: s(4194), commitsRecent: s(485),
    pullRequestsAllTime: s(210), pullRequestsRecent: s(14),
    stars: s(2000), forks: s(500), issuesOpen: s(50), issuesClosed: s(500),
  };
  const full = {
    v: 1, tags: 74, recentDays: 180, contributors: 30,
    commitsAllTime: 4194, commitsRecent: 485,
    pullRequestsAllTime: 210, pullRequestsRecent: 14,
    stars: 2000, forks: 500, issuesOpen: 5, issuesClosed: 140,
  } as SoftwareActivity;

  it('reports no cap with full coverage', () => {
    const r = computeVitality(full, richStats, DEFAULT_CONFIG);
    expect(r.cap).toBeNull();
    expect(r.score100).toBeGreaterThan(89);
  });

  it('caps at 89 when a feature is known disabled', () => {
    const { issuesOpen, issuesClosed, ...rest } = full;
    const r = computeVitality(
      { ...rest, disabled: ['issues'] } as SoftwareActivity,
      richStats, DEFAULT_CONFIG,
    );
    expect(r.cap).toEqual({ limit: 89, reason: 'disabled' });
    expect(r.score100).toBe(89);
  });

  it('caps at 79 when a metric is unknown', () => {
    const { issuesOpen, issuesClosed, ...rest } = full;
    const r = computeVitality(rest as SoftwareActivity, richStats, DEFAULT_CONFIG);
    expect(r.cap).toEqual({ limit: 79, reason: 'unknown' });
    expect(r.score100).toBe(79);
  });

  it('lets unknown win over disabled', () => {
    const { issuesOpen, issuesClosed, stars, ...rest } = full;
    const r = computeVitality(
      { ...rest, disabled: ['issues'] } as SoftwareActivity,
      richStats, DEFAULT_CONFIG,
    );
    expect(r.cap).toEqual({ limit: 79, reason: 'unknown' });
  });

  it('does not truncate a score already under the cap', () => {
    const low = {
      v: 1, tags: 0, recentDays: 90, contributors: 1,
      commitsAllTime: 1, commitsRecent: 1, stars: 1, forks: 1,
      pullRequestsAllTime: 1, pullRequestsRecent: 1,
      disabled: ['issues'],
    } as SoftwareActivity;
    const r = computeVitality(low, richStats, DEFAULT_CONFIG);
    expect(r.cap).toEqual({ limit: 89, reason: 'disabled' });
    expect(r.score100).toBeGreaterThan(0);
    expect(r.score100).toBeLessThan(89);
  });

  it('reports no cap when the score is suppressed', () => {
    const r = computeVitality(
      { ...full, stars: null } as SoftwareActivity,
      richStats, DEFAULT_CONFIG,
    );
    expect(r.score100).toBeNull();
    expect(r.cap).toBeNull();
  });

  it('lets failed win over disabled and unknown together', () => {
    const { issuesOpen, issuesClosed, forks, ...rest } = full;
    const r = computeVitality(
      { ...rest, stars: null, disabled: ['issues'] } as SoftwareActivity,
      richStats, DEFAULT_CONFIG,
    );
    expect(r.score100).toBeNull();
    expect(r.cap).toBeNull();
    expect(r.failed).toEqual(['stars']);
  });
});
