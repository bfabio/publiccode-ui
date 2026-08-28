import { DEFAULT_CONFIG, type ActivityConfig } from './activityScore';

export const STORAGE_KEY = 'publiccode-ui:activity';
export const URL_PARAM = 'activity';
export const OPENCODE_BADGES_VISIBILITY_KEY = 'publiccode-ui:opencode-badges';
export const ACTIVITY_DEBUG_VISIBILITY_KEY = 'publiccode-ui:activity-debug';

export function readOpenCodeBadgeVisibility(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(OPENCODE_BADGES_VISIBILITY_KEY) === '1';
}

// "storage" events fire only in other tabs, so islands on the same page
// (e.g. the header weights popover and the software list) need this
// explicit channel to follow each other's writes.
const tabListeners = new Set<(key: string | null) => void>();

function emitStoreChange(key: string): void {
  tabListeners.forEach((listener) => listener(key));
}

export function writeOpenCodeBadgeVisibility(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) window.localStorage.setItem(OPENCODE_BADGES_VISIBILITY_KEY, '1');
  else window.localStorage.removeItem(OPENCODE_BADGES_VISIBILITY_KEY);
  emitStoreChange(OPENCODE_BADGES_VISIBILITY_KEY);
}

export function readActivityDebugVisibility(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(ACTIVITY_DEBUG_VISIBILITY_KEY) !== '0';
}

export function writeActivityDebugVisibility(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) window.localStorage.removeItem(ACTIVITY_DEBUG_VISIBILITY_KEY);
  else window.localStorage.setItem(ACTIVITY_DEBUG_VISIBILITY_KEY, '0');
  emitStoreChange(ACTIVITY_DEBUG_VISIBILITY_KEY);
}

export function mergeConfig(c: Partial<ActivityConfig> | null): ActivityConfig {
  return {
    weights: { ...DEFAULT_CONFIG.weights, ...(c?.weights ?? {}) },
    subWeights: { ...DEFAULT_CONFIG.subWeights, ...(c?.subWeights ?? {}) },
    issueMode: c?.issueMode === 'open' ? 'open' : 'ratio',
    xmaxMode: c?.xmaxMode === 'max' ? 'max' : 'p95',
  };
}

export function parseConfig(raw: string | null): ActivityConfig | null {
  if (!raw) return null;
  try {
    return mergeConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function isDefaultConfig(c: ActivityConfig): boolean {
  return JSON.stringify(c) === JSON.stringify(DEFAULT_CONFIG);
}

export function pickConfig(
  url: ActivityConfig | null,
  software: ActivityConfig | null,
  global: ActivityConfig | null,
): ActivityConfig {
  return url ?? software ?? global ?? DEFAULT_CONFIG;
}

export function readGlobalConfig(): ActivityConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  return parseConfig(window.localStorage.getItem(STORAGE_KEY)) ?? DEFAULT_CONFIG;
}

export function writeGlobalConfig(config: ActivityConfig): void {
  if (typeof window === 'undefined') return;
  if (isDefaultConfig(config)) window.localStorage.removeItem(STORAGE_KEY);
  else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  emitStoreChange(STORAGE_KEY);
}

export const SOFTWARE_PREFIX = `${STORAGE_KEY}:`;

export function softwareKey(id: string): string {
  return SOFTWARE_PREFIX + id;
}

// The score was called "vitality" until 2026-08, so returning
// visitors still hold their configs under the old keys.
const LEGACY_KEY = 'publiccode-ui:vitality';

export function migrateLegacyConfigs(): void {
  if (typeof window === 'undefined') return;
  const store = window.localStorage;
  const legacy: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (key === LEGACY_KEY || key?.startsWith(`${LEGACY_KEY}:`)) legacy.push(key);
  }
  for (const key of legacy) {
    const value = store.getItem(key);
    const target = STORAGE_KEY + key.slice(LEGACY_KEY.length);
    if (value !== null && store.getItem(target) === null) store.setItem(target, value);
    store.removeItem(key);
  }
}

migrateLegacyConfigs();

export function readSoftwareConfig(id: string): ActivityConfig | null {
  if (typeof window === 'undefined') return null;
  return parseConfig(window.localStorage.getItem(softwareKey(id)));
}

export function writeSoftwareConfig(id: string, config: ActivityConfig): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(softwareKey(id), JSON.stringify(config));
  emitStoreChange(softwareKey(id));
}

export function clearSoftwareConfig(id: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(softwareKey(id));
  emitStoreChange(softwareKey(id));
}

export function readAllSoftwareConfigs(): Map<string, ActivityConfig> {
  const map = new Map<string, ActivityConfig>();
  if (typeof window === 'undefined') return map;
  const store = window.localStorage;
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (!key || !key.startsWith(SOFTWARE_PREFIX)) continue;
    const config = parseConfig(store.getItem(key));
    if (config) map.set(key.slice(SOFTWARE_PREFIX.length), config);
  }
  return map;
}

export function subscribeStore(callback: (key: string | null) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === null || e.key === STORAGE_KEY || e.key === OPENCODE_BADGES_VISIBILITY_KEY || e.key === ACTIVITY_DEBUG_VISIBILITY_KEY || e.key.startsWith(SOFTWARE_PREFIX)) callback(e.key);
  };
  window.addEventListener('storage', handler);
  tabListeners.add(callback);
  return () => {
    window.removeEventListener('storage', handler);
    tabListeners.delete(callback);
  };
}

export function readUrlConfig(): ActivityConfig | null {
  if (typeof window === 'undefined') return null;
  return parseConfig(new URLSearchParams(window.location.search).get(URL_PARAM));
}

function replaceParams(params: URLSearchParams): void {
  const qs = params.toString();
  window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

export function writeUrlConfig(config: ActivityConfig): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  params.set(URL_PARAM, JSON.stringify(config));
  replaceParams(params);
}

export function clearUrlConfig(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  params.delete(URL_PARAM);
  replaceParams(params);
}

export function withActivityConfig(path: string, config: ActivityConfig | null): string {
  if (!config) return path;
  const [beforeHash, hash = ''] = path.split('#', 2);
  const [pathname, query = ''] = beforeHash.split('?', 2);
  const params = new URLSearchParams(query);
  params.set(URL_PARAM, JSON.stringify(config));
  return `${pathname}?${params.toString()}${hash ? `#${hash}` : ''}`;
}
