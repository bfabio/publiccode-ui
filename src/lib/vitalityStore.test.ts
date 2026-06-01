import { describe, it, expect } from 'vitest';
import { mergeConfig, parseConfig, isDefaultConfig, pickConfig } from './vitalityStore.ts';
import { DEFAULT_CONFIG } from './vitality.ts';

describe('mergeConfig', () => {
  it('fills missing fields from defaults', () => {
    const c = mergeConfig({ weights: { ...DEFAULT_CONFIG.weights, stars: 0.5 } });
    expect(c.weights.stars).toBe(0.5);
    expect(c.weights.forks).toBe(DEFAULT_CONFIG.weights.forks);
    expect(c.issueMode).toBe('ratio');
  });

  it('coerces unknown modes to defaults', () => {
    const c = mergeConfig({ issueMode: 'x' as never, xmaxMode: 'y' as never });
    expect(c.issueMode).toBe('ratio');
    expect(c.xmaxMode).toBe('max');
  });
});

describe('parseConfig', () => {
  it('returns null for empty or malformed input', () => {
    expect(parseConfig(null)).toBeNull();
    expect(parseConfig('')).toBeNull();
    expect(parseConfig('{not json')).toBeNull();
  });

  it('parses a serialized config', () => {
    const c = parseConfig(JSON.stringify({ xmaxMode: 'p95' }));
    expect(c?.xmaxMode).toBe('p95');
  });
});

describe('isDefaultConfig', () => {
  it('is true for the default and false otherwise', () => {
    expect(isDefaultConfig(DEFAULT_CONFIG)).toBe(true);
    expect(isDefaultConfig({ ...DEFAULT_CONFIG, issueMode: 'open' })).toBe(false);
  });
});

describe('pickConfig', () => {
  it('prefers url, then global, then default', () => {
    const url = { ...DEFAULT_CONFIG, xmaxMode: 'p95' as const };
    const global = { ...DEFAULT_CONFIG, issueMode: 'open' as const };
    expect(pickConfig(url, global)).toBe(url);
    expect(pickConfig(null, global)).toBe(global);
    expect(pickConfig(null, null)).toBe(DEFAULT_CONFIG);
  });
});
