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
  global: VitalityConfig | null,
): VitalityConfig {
  return url ?? global ?? DEFAULT_CONFIG;
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

export function subscribeGlobal(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) callback();
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
