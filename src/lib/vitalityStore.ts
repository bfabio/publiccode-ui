import { DEFAULT_CONFIG, type VitalityConfig } from './vitality';

export const STORAGE_KEY = 'publiccode-ui:vitality';
export const URL_PARAM = 'activity';
export const OPENCODE_BADGES_VISIBILITY_KEY = 'publiccode-ui:opencode-badges';
export const CAP_WARNING_VISIBILITY_KEY = 'publiccode-ui:activity-cap-warning';

export function readOpenCodeBadgeVisibility(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(OPENCODE_BADGES_VISIBILITY_KEY) === '1';
}

export function writeOpenCodeBadgeVisibility(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) window.localStorage.setItem(OPENCODE_BADGES_VISIBILITY_KEY, '1');
  else window.localStorage.removeItem(OPENCODE_BADGES_VISIBILITY_KEY);
}

export function readCapWarningVisibility(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(CAP_WARNING_VISIBILITY_KEY) !== '0';
}

export function writeCapWarningVisibility(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) window.localStorage.removeItem(CAP_WARNING_VISIBILITY_KEY);
  else window.localStorage.setItem(CAP_WARNING_VISIBILITY_KEY, '0');
}

export function mergeConfig(c: Partial<VitalityConfig> | null): VitalityConfig {
  return {
    weights: { ...DEFAULT_CONFIG.weights, ...(c?.weights ?? {}) },
    subWeights: { ...DEFAULT_CONFIG.subWeights, ...(c?.subWeights ?? {}) },
    issueMode: c?.issueMode === 'open' ? 'open' : 'ratio',
    xmaxMode: c?.xmaxMode === 'p95' ? 'p95' : 'max',
  };
}

export function parseConfig(raw: string | null): VitalityConfig | null {
  if (!raw) return null;
  try {
    return mergeConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function isDefaultConfig(c: VitalityConfig): boolean {
  return JSON.stringify(c) === JSON.stringify(DEFAULT_CONFIG);
}

export function pickConfig(
  url: VitalityConfig | null,
  software: VitalityConfig | null,
  global: VitalityConfig | null,
): VitalityConfig {
  return url ?? software ?? global ?? DEFAULT_CONFIG;
}

export function readGlobalConfig(): VitalityConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  return parseConfig(window.localStorage.getItem(STORAGE_KEY)) ?? DEFAULT_CONFIG;
}

export function writeGlobalConfig(config: VitalityConfig): void {
  if (typeof window === 'undefined') return;
  if (isDefaultConfig(config)) window.localStorage.removeItem(STORAGE_KEY);
  else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export const SOFTWARE_PREFIX = `${STORAGE_KEY}:`;

export function softwareKey(id: string): string {
  return SOFTWARE_PREFIX + id;
}

export function readSoftwareConfig(id: string): VitalityConfig | null {
  if (typeof window === 'undefined') return null;
  return parseConfig(window.localStorage.getItem(softwareKey(id)));
}

export function writeSoftwareConfig(id: string, config: VitalityConfig): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(softwareKey(id), JSON.stringify(config));
}

export function clearSoftwareConfig(id: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(softwareKey(id));
}

export function readAllSoftwareConfigs(): Map<string, VitalityConfig> {
  const map = new Map<string, VitalityConfig>();
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
    if (e.key === null || e.key === STORAGE_KEY || e.key === OPENCODE_BADGES_VISIBILITY_KEY || e.key === CAP_WARNING_VISIBILITY_KEY || e.key.startsWith(SOFTWARE_PREFIX)) callback(e.key);
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

export function readUrlConfig(): VitalityConfig | null {
  if (typeof window === 'undefined') return null;
  return parseConfig(new URLSearchParams(window.location.search).get(URL_PARAM));
}

function replaceParams(params: URLSearchParams): void {
  const qs = params.toString();
  window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

export function writeUrlConfig(config: VitalityConfig): void {
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

export function withActivityConfig(path: string, config: VitalityConfig | null): string {
  if (!config) return path;
  const [beforeHash, hash = ''] = path.split('#', 2);
  const [pathname, query = ''] = beforeHash.split('?', 2);
  const params = new URLSearchParams(query);
  params.set(URL_PARAM, JSON.stringify(config));
  return `${pathname}?${params.toString()}${hash ? `#${hash}` : ''}`;
}
