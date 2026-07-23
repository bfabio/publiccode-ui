import { describe, it, expect } from 'vitest';
import { parseSoftwareActivity, parseCatalogActivity, fieldState, statsByCatalog, usableStats } from './activity.ts';

describe('parseSoftwareActivity', () => {
  it('returns the activity namespace for v1', () => {
    const a = parseSoftwareActivity({ activity: { v: 1, contributors: 3 } });
    expect(a?.contributors).toBe(3);
  });

  it('returns null when activity is absent', () => {
    expect(parseSoftwareActivity({})).toBeNull();
    expect(parseSoftwareActivity(null)).toBeNull();
  });

  it('returns null for an unsupported version', () => {
    expect(parseSoftwareActivity({ activity: { v: 2, contributors: 3 } })).toBeNull();
  });
});

describe('parseCatalogActivity', () => {
  it('returns null when activity is absent', () => {
    expect(parseCatalogActivity({})).toBeNull();
    expect(parseCatalogActivity(null)).toBeNull();
  });

  it('extracts catalog fields for v1', () => {
    const c = parseCatalogActivity({
      activity: {
        v: 1,
        updatedAt: '2026-05-31T08:21:44Z',
        softwareCount: 318,
        recentDays: 90,
        stats: { stars: { max: 9100, min: 0, count: 142, mean: 51.2, median: 4, p95: 230 } },
      },
    });
    expect(c?.softwareCount).toBe(318);
    expect(c?.stats.stars?.p95).toBe(230);
  });

  it('returns null for an unsupported version', () => {
    expect(parseCatalogActivity({ activity: { v: 99 } })).toBeNull();
  });

  it('defaults stats to an empty object when missing', () => {
    const c = parseCatalogActivity({
      activity: { v: 1, updatedAt: 'x', softwareCount: 0, recentDays: 90 },
    });
    expect(c?.stats).toEqual({});
  });
});

describe('fieldState', () => {
  const base = {
    v: 1, contributors: 1, commitsAllTime: 1, pullRequestsAllTime: 1,
    commitsRecent: 1, pullRequestsRecent: 1, tags: 1, recentDays: 90,
  };

  it('reports unknown when the key is missing with no marker', () => {
    expect(fieldState(base as never, 'stars').state).toBe('unknown');
  });

  it('reports disabled when the feature is in the disabled list', () => {
    expect(
      fieldState({ ...base, disabled: ['issues'] } as never, 'issuesOpen').state,
    ).toBe('disabled');
  });

  it('ignores unrecognized disabled entries', () => {
    expect(
      fieldState({ ...base, disabled: ['watchers'] } as never, 'stars').state,
    ).toBe('unknown');
  });

  it('reports unavailable when the value is null', () => {
    expect(fieldState({ ...base, stars: null } as never, 'stars').state).toBe('unavailable');
  });

  it('reports the value when it is a number, including zero', () => {
    expect(fieldState({ ...base, stars: 0 } as never, 'stars')).toEqual({ state: 'value', value: 0 });
  });
});

describe('statsByCatalog', () => {
  const activity = (stats: object) => ({
    v: 1, updatedAt: 'x', softwareCount: 2, recentDays: 90, stats,
  });

  it('omits catalogs whose analysis is null', () => {
    const map = new Map([
      ['a', activity({ contributors: { max: 5, p95: 4 } })],
      ['b', null],
    ]);
    expect(statsByCatalog(map as never)).toEqual({
      a: { contributors: { max: 5, p95: 4 } },
    });
  });

  it('keeps empty stats objects, absent is not the same as empty', () => {
    const map = new Map([['a', activity({})]]);
    expect(statsByCatalog(map as never)).toEqual({ a: {} });
  });

  it('omits single-item catalogs, max equals the item itself', () => {
    const map = new Map([
      ['solo', { ...activity({ contributors: { max: 5, p95: 5 } }), softwareCount: 1 }],
    ]);
    expect(statsByCatalog(map as never)).toEqual({});
  });
});

describe('usableStats', () => {
  const activity = (count: number) => ({
    v: 1, updatedAt: 'x', softwareCount: count, recentDays: 90,
    stats: { contributors: { max: 5, p95: 4 } },
  });

  it('returns null for null activity', () => {
    expect(usableStats(null)).toBeNull();
  });

  it('returns null when the catalog has a single item', () => {
    expect(usableStats(activity(1) as never)).toBeNull();
  });

  it('returns the stats when there is something to compare against', () => {
    expect(usableStats(activity(2) as never)).toEqual({
      contributors: { max: 5, p95: 4 },
    });
  });
});
