import { DEFAULT_CONFIG, DIMENSION_ORDER, type ActivityConfig } from './activityScore';

export const STORAGE_KEY = 'publiccode-ui:activity';
export const URL_PARAM = 'activity';
export const SHARED_PARAM = 'weights';
export const SHARED_KEY = 'publiccode-ui:shared-activity';
export const OPENCODE_BADGES_VISIBILITY_KEY = 'publiccode-ui:opencode-badges';
export const ACTIVITY_DEBUG_VISIBILITY_KEY = 'publiccode-ui:activity-debug';

export function readOpenCodeBadgeVisibility(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(OPENCODE_BADGES_VISIBILITY_KEY) !== '0';
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
  if (enabled) window.localStorage.removeItem(OPENCODE_BADGES_VISIBILITY_KEY);
  else window.localStorage.setItem(OPENCODE_BADGES_VISIBILITY_KEY, '0');
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

export function readSharedConfig(): ActivityConfig | null {
  if (typeof window === 'undefined') return null;
  return parseConfig(window.sessionStorage.getItem(SHARED_KEY));
}

export function readGlobalConfig(): ActivityConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  return readSharedConfig()
    ?? parseConfig(window.localStorage.getItem(STORAGE_KEY))
    ?? DEFAULT_CONFIG;
}

export function clearSharedConfig(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(SHARED_KEY);
  emitStoreChange(STORAGE_KEY);
}

// Editing the weights is the visitor making the shared config their own,
// so the edit persists and the visit copy is dropped.
export function writeGlobalConfig(config: ActivityConfig): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(SHARED_KEY);
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

// Each split pair sums to one, so the commit share alone carries it.
const SPLITS = [['phC', 'phM'], ['caC', 'caM']] as const;

const toPoints = (n: number) => Math.round(n * 100);

// Weights travel as integer hundredths ("stars:20") and only when they
// differ from the defaults, so a shared link stays short.
export function encodeSharedConfig(config: ActivityConfig): string {
  const parts: string[] = [];
  for (const k of DIMENSION_ORDER) {
    const v = toPoints(config.weights[k]);
    if (v !== toPoints(DEFAULT_CONFIG.weights[k])) parts.push(`${k}:${v}`);
  }
  for (const [k] of SPLITS) {
    const v = toPoints(config.subWeights[k]);
    if (v !== toPoints(DEFAULT_CONFIG.subWeights[k])) parts.push(`${k}:${v}`);
  }
  if (config.issueMode !== DEFAULT_CONFIG.issueMode) parts.push(`issueMode:${config.issueMode}`);
  if (config.xmaxMode !== DEFAULT_CONFIG.xmaxMode) parts.push(`xmaxMode:${config.xmaxMode}`);
  return parts.join(',');
}

export function decodeSharedConfig(raw: string | null): ActivityConfig | null {
  if (raw === null) return null;
  const weights = { ...DEFAULT_CONFIG.weights };
  const subWeights = { ...DEFAULT_CONFIG.subWeights };
  const partial: Partial<ActivityConfig> = { weights, subWeights };
  for (const part of raw.split(',')) {
    const [key, value = ''] = part.split(':', 2);
    if (key === 'issueMode' || key === 'xmaxMode') {
      partial[key] = value as never;
      continue;
    }
    if (!/^\d{1,3}$/.test(value)) continue;
    const n = Math.min(100, Number(value)) / 100;
    if ((DIMENSION_ORDER as string[]).includes(key)) weights[key as keyof typeof weights] = n;
    const split = SPLITS.find(([edited]) => edited === key);
    if (split) {
      subWeights[split[0]] = n;
      subWeights[split[1]] = Math.round((1 - n) * 100) / 100;
    }
  }
  return mergeConfig(partial);
}

// A link to the defaults must still carry the parameter: without it the
// recipient's own saved weights would apply instead of the sender's.
export const SHARED_DEFAULT = 'default';

export function sharedConfigUrl(baseUrl: string, config: ActivityConfig): string {
  const url = new URL(baseUrl);
  url.searchParams.set(SHARED_PARAM, encodeSharedConfig(config) || SHARED_DEFAULT);
  // URLSearchParams escapes ":" and ",", which are legal in a query and
  // much easier to read in a pasted link.
  return url.toString().replace(/%3A/gi, ':').replace(/%2C/gi, ',');
}

// A shared link applies to this visit only: it lands in sessionStorage so
// it follows the visitor across pages without overwriting the weights they
// saved themselves. The parameter leaves the address bar once adopted.
export function adoptSharedConfig(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (!params.has(SHARED_PARAM)) return;
  const config = decodeSharedConfig(params.get(SHARED_PARAM));
  if (config) window.sessionStorage.setItem(SHARED_KEY, JSON.stringify(config));
  params.delete(SHARED_PARAM);
  const qs = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
}

adoptSharedConfig();
