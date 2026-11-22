import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  mergeConfig, parseConfig, isDefaultConfig, pickConfig,
  softwareKey, readSoftwareConfig, writeSoftwareConfig,
  clearSoftwareConfig, readAllSoftwareConfigs, subscribeStore, writeGlobalConfig,
  STORAGE_KEY, SOFTWARE_PREFIX, OPENCODE_BADGES_VISIBILITY_KEY, readOpenCodeBadgeVisibility, writeOpenCodeBadgeVisibility,
  ACTIVITY_DEBUG_VISIBILITY_KEY, readActivityDebugVisibility, writeActivityDebugVisibility,
  withActivityConfig, migrateLegacyConfigs,
  readUrlConfig, writeUrlConfig, clearUrlConfig,
  SHARED_KEY, encodeSharedConfig, decodeSharedConfig, sharedConfigUrl, adoptSharedConfig,
  readGlobalConfig, readSharedConfig, clearSharedConfig,
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

  it('falls back to the default for weights that are not numbers between 0 and 1', () => {
    const c = mergeConfig({
      weights: { stars: -0.5, forks: '0.06', issues: 1.5, history: Infinity, activity: 0.4 } as never,
      subWeights: { phC: NaN, phM: null, caC: 1, caM: 0 } as never,
    });
    expect(c.weights).toEqual({ ...DEFAULT_CONFIG.weights, activity: 0.4 });
    expect(c.subWeights).toEqual({ ...DEFAULT_CONFIG.subWeights, caC: 1, caM: 0 });
  });

  it('drops unknown weight keys and ignores weights that are not objects', () => {
    const c = mergeConfig({ weights: { bogus: 0.5 } as never, subWeights: 'x' as never });
    expect(c.weights).toEqual(DEFAULT_CONFIG.weights);
    expect(c.subWeights).toEqual(DEFAULT_CONFIG.subWeights);
  });
});

describe('parseConfig', () => {
  it('returns null for empty or malformed input', () => {
    expect(parseConfig(null)).toBeNull();
    expect(parseConfig('')).toBeNull();
    expect(parseConfig('{not json')).toBeNull();
  });

  it('returns null for JSON that is not an object', () => {
    for (const raw of ['1', 'true', 'null', '"x"', '[]']) expect(parseConfig(raw)).toBeNull();
  });

  it('parses a serialized config', () => {
    const c = parseConfig(JSON.stringify({ xmaxMode: 'max' }));
    expect(c?.xmaxMode).toBe('max');
  });

  it('sanitizes the weights of a shared link', () => {
    const c = parseConfig('{"weights":{"stars":"0.06","forks":-1}}');
    expect(c?.weights).toEqual(DEFAULT_CONFIG.weights);
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

function stubWindow(href = 'https://example.org/') {
  const storage = new FakeStorage();
  const session = new FakeStorage();
  const handlers: ((e: { key: string | null }) => void)[] = [];
  const location = new URL(href);
  vi.stubGlobal('window', {
    localStorage: storage,
    sessionStorage: session,
    location,
    history: { replaceState: (_s: unknown, _t: string, url: string) => { location.href = new URL(url, location).href; } },
    addEventListener: (_t: string, h: (e: { key: string | null }) => void) => handlers.push(h),
    removeEventListener: vi.fn(),
  });
  return { storage, session, location, fire: (key: string | null) => handlers.forEach((h) => h({ key })) };
}

afterEach(() => vi.unstubAllGlobals());

describe('list filter on detail pages', () => {
  it('keeps saved software or global weights when activity=1', () => {
    stubWindow('https://example.org/software/abc?activity=1');
    const global = { ...DEFAULT_CONFIG, xmaxMode: 'max' as const };
    const software = { ...DEFAULT_CONFIG, issueMode: 'open' as const };
    writeGlobalConfig(global);
    writeSoftwareConfig('abc', software);

    expect(pickConfig(readUrlConfig(), readSoftwareConfig('abc'), readGlobalConfig())).toEqual(software);
    clearSoftwareConfig('abc');
    expect(pickConfig(readUrlConfig(), readSoftwareConfig('abc'), readGlobalConfig())).toEqual(global);
  });
});

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

  it('preserves legacy configs when copying fails and retries later', () => {
    const { storage } = stubWindow();
    const custom = JSON.stringify({ ...DEFAULT_CONFIG, issueMode: 'open' });
    const legacyKeys = ['publiccode-ui:vitality', 'publiccode-ui:vitality:abc'];
    for (const key of legacyKeys) storage.setItem(key, custom);
    const write = vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    expect(() => migrateLegacyConfigs()).not.toThrow();
    for (const key of legacyKeys) expect(storage.getItem(key)).toBe(custom);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(storage.getItem(softwareKey('abc'))).toBeNull();

    write.mockRestore();
    migrateLegacyConfigs();
    expect(readGlobalConfig().issueMode).toBe('open');
    expect(readSoftwareConfig('abc')?.issueMode).toBe('open');
    for (const key of legacyKeys) expect(storage.getItem(key)).toBeNull();
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

function stubLocation(search: string, pathname = '/software/abc/') {
  const location = { pathname, search };
  const replaceState = vi.fn((_state: unknown, _title: string, url: string) => {
    location.search = url.startsWith('?') ? url : '';
    if (!url.startsWith('?')) location.pathname = url;
  });
  vi.stubGlobal('window', { location, history: { replaceState } });
  return { location, replaceState };
}

describe('share link config', () => {
  const custom: ActivityConfig = { ...DEFAULT_CONFIG, issueMode: 'open' };

  it('does nothing without a window', () => {
    expect(readUrlConfig()).toBeNull();
    expect(() => writeUrlConfig(custom)).not.toThrow();
    expect(() => clearUrlConfig()).not.toThrow();
  });

  it('reads the activity param', () => {
    stubLocation(`?${new URLSearchParams({ activity: JSON.stringify(custom) })}`);
    expect(readUrlConfig()).toEqual(custom);
  });

  it('returns null without the param or with a broken one', () => {
    stubLocation('?tab=metrics');
    expect(readUrlConfig()).toBeNull();
    stubLocation('?activity=%7Bnot%20json');
    expect(readUrlConfig()).toBeNull();
  });

  it('writes the config and keeps unrelated params', () => {
    const { location, replaceState } = stubLocation('?tab=metrics&activity=old');
    writeUrlConfig(custom);
    expect(replaceState).toHaveBeenCalledTimes(1);
    const params = new URLSearchParams(location.search);
    expect(params.get('tab')).toBe('metrics');
    expect(params.getAll('activity')).toHaveLength(1);
    expect(readUrlConfig()).toEqual(custom);
  });

  it('clears only the activity param', () => {
    const { location } = stubLocation(`?tab=metrics&activity=${encodeURIComponent(JSON.stringify(custom))}`);
    clearUrlConfig();
    expect(location.search).toBe('?tab=metrics');
    expect(location.pathname).toBe('/software/abc/');
  });

  it('falls back to the bare path when no param is left', () => {
    const { location, replaceState } = stubLocation(`?activity=${encodeURIComponent(JSON.stringify(custom))}`);
    clearUrlConfig();
    expect(replaceState).toHaveBeenCalledWith(null, '', '/software/abc/');
    expect(location.search).toBe('');
  });
});

describe('shared global weights', () => {
  const tuned: ActivityConfig = {
    ...DEFAULT_CONFIG,
    weights: { ...DEFAULT_CONFIG.weights, stars: 0.18, forks: 0 },
    subWeights: { ...DEFAULT_CONFIG.subWeights, phC: 0.55, phM: 0.45 },
    issueMode: 'open',
  };

  it('encodes only what differs from the defaults', () => {
    expect(encodeSharedConfig(DEFAULT_CONFIG)).toBe('');
    expect(encodeSharedConfig(tuned)).toBe('stars:18,forks:0,phC:55,issueMode:open');
  });

  it('decodes back to the same config and derives the paired split', () => {
    expect(decodeSharedConfig(encodeSharedConfig(tuned))).toEqual(tuned);
    expect(decodeSharedConfig(null)).toBeNull();
  });

  it('ignores unknown keys and malformed values', () => {
    const c = decodeSharedConfig('stars:abc,bogus:5,forks:-3,history:5,xmaxMode:nope');
    expect(c).toEqual({ ...DEFAULT_CONFIG, weights: { ...DEFAULT_CONFIG.weights, history: 0.05 } });
  });

  it('refuses weights that exceed 100 points', () => {
    expect(decodeSharedConfig('history:250')).toBeNull();
    expect(decodeSharedConfig('stars:100')).toBeNull();
    expect(decodeSharedConfig('stars:7')).toBeNull();
    expect(decodeSharedConfig('stars:100,contributors:0,history:0,activity:0,issues:0,forks:0'))
      .toEqual({ ...DEFAULT_CONFIG, weights: { contributors: 0, history: 0, activity: 0, stars: 1, issues: 0, forks: 0 } });
  });

  it('builds a readable link that keeps other parameters', () => {
    expect(sharedConfigUrl('https://example.org/it/?view=table', tuned))
      .toBe('https://example.org/it/?view=table&weights=stars:18,forks:0,phC:55,issueMode:open');
    expect(sharedConfigUrl('https://example.org/?weights=stars:1', DEFAULT_CONFIG))
      .toBe('https://example.org/?weights=default');
    expect(decodeSharedConfig('default')).toEqual(DEFAULT_CONFIG);
  });

  it('applies a shared link for the visit, over the saved weights, without touching them', () => {
    const saved = JSON.stringify({ ...DEFAULT_CONFIG, xmaxMode: 'max' });
    const { storage, location } = stubWindow('https://example.org/it/?view=table&weights=stars:18,forks:0,issueMode:open#top');
    storage.setItem(STORAGE_KEY, saved);
    adoptSharedConfig();
    expect(location.href).toBe('https://example.org/it/?view=table#top');
    expect(readGlobalConfig().weights.stars).toBe(0.18);
    expect(readGlobalConfig().xmaxMode).toBe('p95');
    expect(storage.getItem(STORAGE_KEY)).toBe(saved);
    clearSharedConfig();
    expect(readSharedConfig()).toBeNull();
    expect(readGlobalConfig().xmaxMode).toBe('max');
  });

  it('drops the visit copy once the weights are edited', () => {
    const { session, storage } = stubWindow('https://example.org/?weights=stars:18,forks:0');
    adoptSharedConfig();
    expect(session.getItem(SHARED_KEY)).not.toBeNull();
    writeGlobalConfig(readGlobalConfig());
    expect(session.getItem(SHARED_KEY)).toBeNull();
    expect(parseConfig(storage.getItem(STORAGE_KEY))?.weights.stars).toBe(0.18);
  });

  it('leaves an over-allocated link out of the visit', () => {
    const { session, location } = stubWindow('https://example.org/?weights=stars:100');
    adoptSharedConfig();
    expect(session.getItem(SHARED_KEY)).toBeNull();
    expect(location.href).toBe('https://example.org/');
  });

  it('applies a link to the defaults over the recipient\'s saved weights', () => {
    const custom = { ...DEFAULT_CONFIG, weights: { ...DEFAULT_CONFIG.weights, stars: 0 } };
    const link = sharedConfigUrl('https://example.org/', DEFAULT_CONFIG);
    const { storage, session } = stubWindow(link);
    storage.setItem(STORAGE_KEY, JSON.stringify(custom));
    adoptSharedConfig();
    expect(readGlobalConfig()).toEqual(DEFAULT_CONFIG);
    expect(parseConfig(storage.getItem(STORAGE_KEY))).toEqual(custom);
    writeGlobalConfig(readGlobalConfig());
    expect(session.getItem(SHARED_KEY)).toBeNull();
    expect(readGlobalConfig()).toEqual(DEFAULT_CONFIG);
  });
});

describe('blocked site storage', () => {
  function stubBlockedWindow() {
    const win = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(win, 'sessionStorage', {
      get() { throw new DOMException('The operation is insecure.', 'SecurityError'); },
    });
    Object.defineProperty(win, 'localStorage', {
      get() { throw new DOMException('The operation is insecure.', 'SecurityError'); },
    });
    vi.stubGlobal('window', win);
  }

  it('falls back to the defaults without throwing', () => {
    stubBlockedWindow();
    expect(() => migrateLegacyConfigs()).not.toThrow();
    expect(readGlobalConfig()).toEqual(DEFAULT_CONFIG);
    expect(readSoftwareConfig('blocked-default')).toBeNull();
    expect(readOpenCodeBadgeVisibility()).toBe(true);
    expect(readActivityDebugVisibility()).toBe(true);
  });

  it('keeps writes for the page view and notifies the other islands', () => {
    stubBlockedWindow();
    const custom: ActivityConfig = { ...DEFAULT_CONFIG, issueMode: 'open' };
    const cb = vi.fn();
    const unsubscribe = subscribeStore(cb);
    writeGlobalConfig(custom);
    writeSoftwareConfig('blocked-write', custom);
    writeOpenCodeBadgeVisibility(false);
    expect(cb).toHaveBeenCalledWith(STORAGE_KEY);
    expect(readGlobalConfig().issueMode).toBe('open');
    expect(readAllSoftwareConfigs().get('blocked-write')?.issueMode).toBe('open');
    expect(readOpenCodeBadgeVisibility()).toBe(false);
    writeGlobalConfig(DEFAULT_CONFIG);
    clearSoftwareConfig('blocked-write');
    writeOpenCodeBadgeVisibility(true);
    expect(readGlobalConfig()).toEqual(DEFAULT_CONFIG);
    expect(readSoftwareConfig('blocked-write')).toBeNull();
    unsubscribe();
  });

  it('adopts and clears shared weights when session storage is blocked', () => {
    const { location } = stubWindow('https://example.org/?weights=issueMode:open');
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() { throw new DOMException('Blocked', 'SecurityError'); },
    });
    expect(() => adoptSharedConfig()).not.toThrow();
    expect(location.search).toBe('');
    expect(readSharedConfig()?.issueMode).toBe('open');
    expect(readGlobalConfig().issueMode).toBe('open');
    clearSharedConfig();
    expect(readSharedConfig()).toBeNull();
    location.search = '?weights=issueMode:open';
    adoptSharedConfig();
    writeGlobalConfig(DEFAULT_CONFIG);
    expect(readSharedConfig()).toBeNull();
  });

  it('ignores a write the store refuses', () => {
    const { storage } = stubWindow();
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    expect(() => writeSoftwareConfig('full', { ...DEFAULT_CONFIG, issueMode: 'open' })).not.toThrow();
    expect(readSoftwareConfig('full')).toBeNull();
  });
});
