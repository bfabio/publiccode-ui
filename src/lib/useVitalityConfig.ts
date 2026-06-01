import { useEffect, useRef, useState } from 'react';
import {
  readGlobalConfig,
  writeGlobalConfig,
  readUrlConfig,
  writeUrlConfig,
  clearUrlConfig,
  pickConfig,
  subscribeGlobal,
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

export function useGlobalActivityConfigValue(): VitalityConfig {
  const [config, setConfig] = useState<VitalityConfig>(() => readGlobalConfig());
  useEffect(() => subscribeGlobal(() => setConfig(readGlobalConfig())), []);
  return config;
}

export function usePageActivityConfig() {
  const [config, setConfig] = useState<VitalityConfig>(() =>
    pickConfig(readUrlConfig(), readGlobalConfig()),
  );
  const [overridden, setOverridden] = useState<boolean>(() => readUrlConfig() !== null);
  const overriddenRef = useRef(overridden);
  overriddenRef.current = overridden;

  useEffect(
    () =>
      subscribeGlobal(() => {
        if (!overriddenRef.current) setConfig(readGlobalConfig());
      }),
    [],
  );

  const edit = (next: VitalityConfig) => {
    setConfig(next);
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
      clearUrlConfig();
      setConfig(readGlobalConfig());
      setOverridden(false);
    },
  };
}
