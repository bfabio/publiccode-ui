import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  readGlobalConfig,
  writeGlobalConfig,
  readUrlConfig,
  writeUrlConfig,
  clearUrlConfig,
  pickConfig,
  subscribeStore,
  readSoftwareConfig,
  writeSoftwareConfig,
  clearSoftwareConfig,
  softwareKey,
  STORAGE_KEY,
  readAllSoftwareConfigs,
  readOpenCodeBadgeVisibility,
  writeOpenCodeBadgeVisibility,
  OPENCODE_BADGES_VISIBILITY_KEY,
  readCapWarningVisibility,
  writeCapWarningVisibility,
  CAP_WARNING_VISIBILITY_KEY,
  readListWeightDistributionVisibility,
  writeListWeightDistributionVisibility,
  LIST_WEIGHT_DISTRIBUTION_VISIBILITY_KEY,
} from './vitalityStore';
import {
  rebalanceWeights,
  DEFAULT_CONFIG,
  type VitalityConfig,
  type DimensionKey,
} from './vitality';

type SubKey = keyof VitalityConfig['subWeights'];
const round2 = (n: number) => Math.round(n * 100) / 100;
const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function applyWeight(c: VitalityConfig, key: DimensionKey, value: number): VitalityConfig {
  return { ...c, weights: rebalanceWeights(c.weights, key, value) };
}

function applySplit(c: VitalityConfig, edited: SubKey, other: SubKey, value: number): VitalityConfig {
  const v = round2(Math.max(0, Math.min(1, value)));
  return { ...c, subWeights: { ...c.subWeights, [edited]: v, [other]: round2(1 - v) } };
}

export function useGlobalActivityConfig() {
  const [config, setConfig] = useState<VitalityConfig>(DEFAULT_CONFIG);
  const [ready, setReady] = useState(false);
  useClientLayoutEffect(() => {
    const load = () => setConfig(readGlobalConfig());
    load();
    setReady(true);
    return subscribeStore(load);
  }, []);
  const update = (next: VitalityConfig) => {
    setConfig(next);
    writeGlobalConfig(next);
  };
  return {
    config,
    ready,
    setWeight: (k: DimensionKey, v: number) => update(applyWeight(config, k, v)),
    setSplit: (e: SubKey, o: SubKey, v: number) => update(applySplit(config, e, o, v)),
    setIssueMode: (m: VitalityConfig['issueMode']) => update({ ...config, issueMode: m }),
    setXmaxMode: (m: VitalityConfig['xmaxMode']) => update({ ...config, xmaxMode: m }),
    reset: () => update(DEFAULT_CONFIG),
  };
}

export function usePageActivityConfig(softwareId: string) {
  const [config, setConfig] = useState<VitalityConfig>(DEFAULT_CONFIG);
  const [overridden, setOverridden] = useState(false);
  const [ready, setReady] = useState(false);
  const overriddenRef = useRef(overridden);
  overriddenRef.current = overridden;

  useClientLayoutEffect(() => {
    const load = () => {
      const url = readUrlConfig();
      const software = readSoftwareConfig(softwareId);
      setConfig(pickConfig(url, software, readGlobalConfig()));
      setOverridden(url !== null || software !== null);
    };
    load();
    setReady(true);
    return subscribeStore((key) => {
        if (key === STORAGE_KEY) {
          if (!overriddenRef.current) setConfig(readGlobalConfig());
          return;
        }
        if (key !== null && key !== softwareKey(softwareId)) return;
        const stored = readSoftwareConfig(softwareId);
        if (stored) {
          setConfig(stored);
          writeUrlConfig(stored);
          setOverridden(true);
        } else {
          clearUrlConfig();
          setConfig(readGlobalConfig());
          setOverridden(false);
        }
    });
  }, [softwareId]);

  const edit = (next: VitalityConfig) => {
    setConfig(next);
    writeSoftwareConfig(softwareId, next);
    writeUrlConfig(next);
    setOverridden(true);
  };

  return {
    config,
    overridden,
    ready,
    setWeight: (k: DimensionKey, v: number) => edit(applyWeight(config, k, v)),
    setSplit: (e: SubKey, o: SubKey, v: number) => edit(applySplit(config, e, o, v)),
    setIssueMode: (m: VitalityConfig['issueMode']) => edit({ ...config, issueMode: m }),
    setXmaxMode: (m: VitalityConfig['xmaxMode']) => edit({ ...config, xmaxMode: m }),
    resetToGlobal: () => {
      clearSoftwareConfig(softwareId);
      clearUrlConfig();
      setConfig(readGlobalConfig());
      setOverridden(false);
    },
  };
}

export function useActivityConfigs() {
  const [global, setGlobal] = useState<VitalityConfig>(DEFAULT_CONFIG);
  const [overrides, setOverrides] = useState<Map<string, VitalityConfig>>(
    () => new Map(),
  );
  const [ready, setReady] = useState(false);

  useClientLayoutEffect(() => {
    const load = () => {
      setGlobal(readGlobalConfig());
      setOverrides(readAllSoftwareConfigs());
    };
    load();
    setReady(true);
    return subscribeStore(load);
  }, []);

  const updateFor = (id: string, next: VitalityConfig) => {
    writeSoftwareConfig(id, next);
    setOverrides((current) => new Map(current).set(id, next));
  };

  return {
    configFor: (id: string) => overrides.get(id) ?? global,
    hasOverride: (id: string) => overrides.has(id),
    ready,
    setWeightFor: (id: string, key: DimensionKey, value: number) => {
      const next = applyWeight(overrides.get(id) ?? global, key, value);
      updateFor(id, next);
    },
    setSplitFor: (id: string, edited: SubKey, other: SubKey, value: number) => {
      updateFor(id, applySplit(overrides.get(id) ?? global, edited, other, value));
    },
    setIssueModeFor: (id: string, mode: VitalityConfig['issueMode']) => {
      updateFor(id, { ...(overrides.get(id) ?? global), issueMode: mode });
    },
    setXmaxModeFor: (id: string, mode: VitalityConfig['xmaxMode']) => {
      updateFor(id, { ...(overrides.get(id) ?? global), xmaxMode: mode });
    },
    resetFor: (id: string) => {
      clearSoftwareConfig(id);
      setOverrides((current) => {
        const next = new Map(current);
        next.delete(id);
        return next;
      });
    },
  };
}

export function useOpenCodeBadgeVisibility() {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useClientLayoutEffect(() => {
    const load = () => setEnabled(readOpenCodeBadgeVisibility());
    load();
    setReady(true);
    return subscribeStore((key) => {
      if (key === null || key === OPENCODE_BADGES_VISIBILITY_KEY) load();
    });
  }, []);

  const update = (next: boolean) => {
    setEnabled(next);
    writeOpenCodeBadgeVisibility(next);
    document.documentElement.toggleAttribute('data-opencode-badges-hidden', !next);
  };

  return { enabled, ready, setEnabled: update };
}

export function useCapWarningVisibility() {
  const [enabled, setEnabled] = useState(true);
  const [ready, setReady] = useState(false);

  useClientLayoutEffect(() => {
    const load = () => setEnabled(readCapWarningVisibility());
    load();
    setReady(true);
    return subscribeStore((key) => {
      if (key === null || key === CAP_WARNING_VISIBILITY_KEY) load();
    });
  }, []);

  const update = (next: boolean) => {
    setEnabled(next);
    writeCapWarningVisibility(next);
  };

  return { enabled, ready, setEnabled: update };
}

export function useListWeightDistributionVisibility() {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useClientLayoutEffect(() => {
    const load = () => setEnabled(readListWeightDistributionVisibility());
    load();
    setReady(true);
    return subscribeStore((key) => {
      if (key === null || key === LIST_WEIGHT_DISTRIBUTION_VISIBILITY_KEY) load();
    });
  }, []);

  const update = (next: boolean) => {
    setEnabled(next);
    writeListWeightDistributionVisibility(next);
  };

  return { enabled, ready, setEnabled: update };
}
