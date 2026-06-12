import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { parseSoftwareActivity, parseCatalogActivity, fieldState, usableStats } from './activity.ts';
import type { ForgeMetric } from '../types/analysis';

// Golden fixtures vendored from developers-italia-api
// (docs/analysis/fixtures/): CI diffs them against upstream main.
const fixture = (name: string) =>
  JSON.parse(
    readFileSync(new URL(`../../test/fixtures/analysis/${name}.json`, import.meta.url), 'utf8'),
  ) as unknown;

const forgeMetrics: ForgeMetric[] = [
  'stars',
  'forks',
  'issuesOpen',
  'issuesClosed',
  'pullRequestsAllTime',
  'pullRequestsRecent',
];

describe('software activity contract', () => {
  it('parses the all-fields fixture with every metric valued', () => {
    const a = parseSoftwareActivity({ activity: fixture('software/all-fields') });
    expect(a).not.toBeNull();
    expect(a?.contributors).toBe(12);
    for (const metric of forgeMetrics) {
      expect(fieldState(a!, metric).state).toBe('value');
    }
  });

  it('reports every forge metric unavailable for the forge-failed fixture', () => {
    const a = parseSoftwareActivity({ activity: fixture('software/forge-failed') });
    expect(a).not.toBeNull();
    for (const metric of forgeMetrics) {
      expect(fieldState(a!, metric).state).toBe('unavailable');
    }
  });

  it('reports every forge metric unknown for the forge-unsupported fixture', () => {
    const a = parseSoftwareActivity({ activity: fixture('software/forge-unsupported') });
    expect(a).not.toBeNull();
    for (const metric of forgeMetrics) {
      expect(fieldState(a!, metric).state).toBe('unknown');
    }
  });

  it('distinguishes one absent metric from the valued ones', () => {
    const a = parseSoftwareActivity({ activity: fixture('software/pr-recent-absent') });
    expect(fieldState(a!, 'pullRequestsRecent').state).toBe('unknown');
    expect(fieldState(a!, 'pullRequestsAllTime')).toEqual({ state: 'value', value: 210 });
  });

  it('reports issues disabled but the rest valued for the issues-disabled fixture', () => {
    const a = parseSoftwareActivity({ activity: fixture('software/issues-disabled') });
    expect(fieldState(a!, 'issuesOpen').state).toBe('disabled');
    expect(fieldState(a!, 'issuesClosed').state).toBe('disabled');
    expect(fieldState(a!, 'stars')).toEqual({ state: 'value', value: 87 });
    expect(fieldState(a!, 'pullRequestsRecent')).toEqual({ state: 'value', value: 14 });
  });

  it('reports issues unknown for the issues-unknown fixture', () => {
    const a = parseSoftwareActivity({ activity: fixture('software/issues-unknown') });
    expect(fieldState(a!, 'issuesOpen').state).toBe('unknown');
    expect(fieldState(a!, 'issuesClosed').state).toBe('unknown');
    expect(fieldState(a!, 'stars')).toEqual({ state: 'value', value: 87 });
  });
});

describe('catalog activity contract', () => {
  it('exposes usable stats for the multi-item fixture', () => {
    const c = parseCatalogActivity({ activity: fixture('catalog/multi-item') });
    const stats = usableStats(c);
    expect(stats?.stars?.max).toBe(120);
    expect(stats?.contributors?.count).toBe(3);
  });

  it('never scores against the single-item fixture stats', () => {
    const c = parseCatalogActivity({ activity: fixture('catalog/single-item') });
    expect(c).not.toBeNull();
    expect(usableStats(c)).toBeNull();
  });

  it('accepts partial stats from the no-forge-stats fixture', () => {
    const c = parseCatalogActivity({ activity: fixture('catalog/no-forge-stats') });
    const stats = usableStats(c);
    expect(stats?.contributors?.max).toBe(4);
    expect(stats?.stars).toBeUndefined();
  });
});
