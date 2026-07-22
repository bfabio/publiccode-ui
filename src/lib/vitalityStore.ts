import { DEFAULT_CONFIG, type VitalityConfig } from './vitality';

export const STORAGE_KEY = 'publiccode-ui:vitality';
export const URL_PARAM = 'activity';

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
    if (e.key === null || e.key === STORAGE_KEY || e.key.startsWith(SOFTWARE_PREFIX)) callback(e.key);
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
