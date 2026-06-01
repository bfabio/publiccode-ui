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
