import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  mergeConfig, parseConfig, isDefaultConfig, pickConfig,
  softwareKey, readSoftwareConfig, writeSoftwareConfig,
  clearSoftwareConfig, readAllSoftwareConfigs, subscribeStore, writeGlobalConfig,
  STORAGE_KEY, SOFTWARE_PREFIX, OPENCODE_BADGES_VISIBILITY_KEY, readOpenCodeBadgeVisibility, writeOpenCodeBadgeVisibility,
  ACTIVITY_DEBUG_VISIBILITY_KEY, readActivityDebugVisibility, writeActivityDebugVisibility,
  withActivityConfig, migrateLegacyConfigs,
} from './activityStore.ts';
import { DEFAULT_CONFIG, type ActivityConfig } from './activityScore.ts';

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
    expect(c.xmaxMode).toBe('p95');
  });
});

describe('parseConfig', () => {
  it('returns null for empty or malformed input', () => {
    expect(parseConfig(null)).toBeNull();
    expect(parseConfig('')).toBeNull();
    expect(parseConfig('{not json')).toBeNull();
  });

  it('parses a serialized config', () => {
    const c = parseConfig(JSON.stringify({ xmaxMode: 'max' }));
    expect(c?.xmaxMode).toBe('max');
  });
});

describe('isDefaultConfig', () => {
  it('is true for the default and false otherwise', () => {
    expect(isDefaultConfig(DEFAULT_CONFIG)).toBe(true);
    expect(isDefaultConfig({ ...DEFAULT_CONFIG, issueMode: 'open' })).toBe(false);
  });
});

describe('pickConfig', () => {
  it('prefers url, then software, then global, then default', () => {
    const url = { ...DEFAULT_CONFIG, xmaxMode: 'max' as const };
    const software = { ...DEFAULT_CONFIG, issueMode: 'open' as const };
    const global = { ...DEFAULT_CONFIG, xmaxMode: 'max' as const, issueMode: 'open' as const };
    expect(pickConfig(url, software, global)).toBe(url);
    expect(pickConfig(null, software, global)).toBe(software);
    expect(pickConfig(null, null, global)).toBe(global);
    expect(pickConfig(null, null, null)).toBe(DEFAULT_CONFIG);
  });
});

class FakeStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

function stubWindow() {
  const storage = new FakeStorage();
  const handlers: ((e: { key: string | null }) => void)[] = [];
  vi.stubGlobal('window', {
    localStorage: storage,
    addEventListener: (_t: string, h: (e: { key: string | null }) => void) => handlers.push(h),
    removeEventListener: vi.fn(),
  });
  return { storage, fire: (key: string | null) => handlers.forEach((h) => h({ key })) };
}

afterEach(() => vi.unstubAllGlobals());

describe('software configs', () => {
  const custom: ActivityConfig = { ...DEFAULT_CONFIG, issueMode: 'open' };

  it('builds the key from the prefix', () => {
    expect(softwareKey('abc')).toBe(`${SOFTWARE_PREFIX}abc`);
    expect(softwareKey('abc').startsWith(`${STORAGE_KEY}:`)).toBe(true);
  });

  it('roundtrips write, read, clear', () => {
    stubWindow();
    expect(readSoftwareConfig('abc')).toBeNull();
    writeSoftwareConfig('abc', custom);
    expect(readSoftwareConfig('abc')?.issueMode).toBe('open');
    clearSoftwareConfig('abc');
    expect(readSoftwareConfig('abc')).toBeNull();
  });

  it('returns null for an unparseable stored value', () => {
    const { storage } = stubWindow();
    storage.setItem(softwareKey('abc'), '{not json');
    expect(readSoftwareConfig('abc')).toBeNull();
  });

  it('scans only per software keys, skipping foreign and broken ones', () => {
    const { storage } = stubWindow();
    writeSoftwareConfig('abc', custom);
    storage.setItem(STORAGE_KEY, JSON.stringify(custom));
    storage.setItem('unrelated', 'x');
    storage.setItem(softwareKey('broken'), '{not json');
    const all = readAllSoftwareConfigs();
    expect([...all.keys()]).toEqual(['abc']);
    expect(all.get('abc')?.issueMode).toBe('open');
  });
});

describe('migrateLegacyConfigs', () => {
  it('moves the old vitality keys to the activity keys', () => {
    const { storage } = stubWindow();
    const custom = JSON.stringify({ ...DEFAULT_CONFIG, issueMode: 'open' });
    storage.setItem('publiccode-ui:vitality', custom);
    storage.setItem('publiccode-ui:vitality:abc', custom);
    migrateLegacyConfigs();
    expect(storage.getItem(STORAGE_KEY)).toBe(custom);
    expect(storage.getItem(softwareKey('abc'))).toBe(custom);
    expect(storage.getItem('publiccode-ui:vitality')).toBeNull();
    expect(storage.getItem('publiccode-ui:vitality:abc')).toBeNull();
  });

  it('keeps an already written activity key over the old value', () => {
    const { storage } = stubWindow();
    storage.setItem('publiccode-ui:vitality', 'old');
    storage.setItem(STORAGE_KEY, 'new');
    migrateLegacyConfigs();
    expect(storage.getItem(STORAGE_KEY)).toBe('new');
    expect(storage.getItem('publiccode-ui:vitality')).toBeNull();
  });
});

describe('subscribeStore', () => {
  it('fires for our keys and full clears, not foreign keys', () => {
    const { fire } = stubWindow();
    const seen: (string | null)[] = [];
    subscribeStore((k) => seen.push(k));
    fire(STORAGE_KEY);
    fire(softwareKey('abc'));
    fire(OPENCODE_BADGES_VISIBILITY_KEY);
    fire(ACTIVITY_DEBUG_VISIBILITY_KEY);
    fire('unrelated-key');
    fire('publiccode-ui:activityBackup');
    fire(null);
    expect(seen).toEqual([STORAGE_KEY, softwareKey('abc'), OPENCODE_BADGES_VISIBILITY_KEY, ACTIVITY_DEBUG_VISIBILITY_KEY, null]);
  });

  it('fires for same-tab writes, where no storage event exists', () => {
    stubWindow();
    const seen: (string | null)[] = [];
    const unsubscribe = subscribeStore((k) => seen.push(k));
    writeGlobalConfig({ ...DEFAULT_CONFIG, issueMode: 'open' });
    writeSoftwareConfig('abc', DEFAULT_CONFIG);
    clearSoftwareConfig('abc');
    writeOpenCodeBadgeVisibility(true);
    expect(seen).toEqual([STORAGE_KEY, softwareKey('abc'), softwareKey('abc'), OPENCODE_BADGES_VISIBILITY_KEY]);
    unsubscribe();
    writeGlobalConfig(DEFAULT_CONFIG);
    expect(seen).toHaveLength(4);
  });
});

describe('openCode badge visibility', () => {
  it('is enabled by default and persists only the disabled state', () => {
    const { storage } = stubWindow();
    expect(readOpenCodeBadgeVisibility()).toBe(true);
    writeOpenCodeBadgeVisibility(false);
    expect(readOpenCodeBadgeVisibility()).toBe(false);
    expect(storage.getItem(OPENCODE_BADGES_VISIBILITY_KEY)).toBe('0');
    writeOpenCodeBadgeVisibility(true);
    expect(readOpenCodeBadgeVisibility()).toBe(true);
    expect(storage.getItem(OPENCODE_BADGES_VISIBILITY_KEY)).toBeNull();
  });
});

describe('activity debug visibility', () => {
  it('is enabled by default and persists only the disabled state', () => {
    const { storage } = stubWindow();
    expect(readActivityDebugVisibility()).toBe(true);
    writeActivityDebugVisibility(false);
    expect(readActivityDebugVisibility()).toBe(false);
    expect(storage.getItem(ACTIVITY_DEBUG_VISIBILITY_KEY)).toBe('0');
    writeActivityDebugVisibility(true);
    expect(readActivityDebugVisibility()).toBe(true);
    expect(storage.getItem(ACTIVITY_DEBUG_VISIBILITY_KEY)).toBeNull();
  });
});

describe('withActivityConfig', () => {
  it('adds a shareable activity config without dropping existing query params', () => {
    const href = withActivityConfig('/software/abc?tab=metrics', DEFAULT_CONFIG);
    const [path, query] = href.split('?');
    const params = new URLSearchParams(query);
    expect(path).toBe('/software/abc');
    expect(params.get('tab')).toBe('metrics');
    expect(parseConfig(params.get('activity'))).toEqual(DEFAULT_CONFIG);
  });

  it('leaves regular software links untouched', () => {
    expect(withActivityConfig('/software/abc', null)).toBe('/software/abc');
  });
});
