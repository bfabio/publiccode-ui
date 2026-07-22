import { useEffect, useRef, useState } from 'react';
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
} from './vitalityStore';
import {
  rebalanceWeights,
  DEFAULT_CONFIG,
  type VitalityConfig,
  type DimensionKey,
} from './vitality';

type SubKey = keyof VitalityConfig['subWeights'];
const round2 = (n: number) => Math.round(n * 100) / 100;

function applyWeight(c: VitalityConfig, key: DimensionKey, value: number): VitalityConfig {
  return { ...c, weights: rebalanceWeights(c.weights, key, value) };
}

function applySplit(c: VitalityConfig, edited: SubKey, other: SubKey, value: number): VitalityConfig {
  const v = round2(Math.max(0, Math.min(1, value)));
  return { ...c, subWeights: { ...c.subWeights, [edited]: v, [other]: round2(1 - v) } };
}

export function useGlobalActivityConfig() {
  const [config, setConfig] = useState<VitalityConfig>(() => readGlobalConfig());
  const update = (next: VitalityConfig) => {
    setConfig(next);
    writeGlobalConfig(next);
  };
  return {
    config,
    setWeight: (k: DimensionKey, v: number) => update(applyWeight(config, k, v)),
    setSplit: (e: SubKey, o: SubKey, v: number) => update(applySplit(config, e, o, v)),
    setIssueMode: (m: VitalityConfig['issueMode']) => update({ ...config, issueMode: m }),
    setXmaxMode: (m: VitalityConfig['xmaxMode']) => update({ ...config, xmaxMode: m }),
    reset: () => update(DEFAULT_CONFIG),
  };
}

export function usePageActivityConfig(softwareId: string) {
  const [config, setConfig] = useState<VitalityConfig>(() =>
    pickConfig(readUrlConfig(), readSoftwareConfig(softwareId), readGlobalConfig()),
  );
  const [overridden, setOverridden] = useState<boolean>(
    () => readUrlConfig() !== null || readSoftwareConfig(softwareId) !== null,
  );
  const overriddenRef = useRef(overridden);
  overriddenRef.current = overridden;

  useEffect(
    () =>
      subscribeStore((key) => {
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
      }),
    [softwareId],
  );

  const edit = (next: VitalityConfig) => {
    setConfig(next);
    writeSoftwareConfig(softwareId, next);
    writeUrlConfig(next);
    setOverridden(true);
  };

  return {
    config,
    overridden,
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

  useEffect(() => {
    const load = () => {
      setGlobal(readGlobalConfig());
      setOverrides(readAllSoftwareConfigs());
    };
    load();
    return subscribeStore(load);
  }, []);

  return {
    configFor: (id: string) => overrides.get(id) ?? global,
    hasOverride: (id: string) => overrides.has(id),
  };
}
