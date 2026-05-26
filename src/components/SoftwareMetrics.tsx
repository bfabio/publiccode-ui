import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartColumn, faAngleDown } from "@fortawesome/free-solid-svg-icons";
import {
  computeVitality,
  rebalanceWeights,
  DEFAULT_CONFIG,
  type VitalityConfig,
  type DimensionKey,
} from "../lib/vitality";
import type { SoftwareActivity, CatalogStats } from "../types/analysis";

const STORAGE_KEY = "publiccode-ui:vitality";
const URL_PARAM = "vitality";

const LABELS = {
  en: {
    section: "Activity",
    debugShow: "Show debug",
    debugHide: "Hide debug",
    groupCode: "Code",
    groupCommunity: "Community",
    info: "Info",
    contributors: "Contributors",
    commitsAll: "Commits, all time",
    mergesAll: "Pull requests, all time",
    commitsWindow: (d: number) => `Commits, last ${d} days`,
    mergesWindow: (d: number) => `Pull requests, last ${d} days`,
    stars: "Stars",
    forks: "Forks",
    issuesOpen: "Open issues",
    issuesClosed: "Closed issues",
    releases: "Releases",
    oldestCommit: "First commit",
    dim: {
      contributors: "Contributors",
      history: "Project history",
      activity: "Current activity",
      stars: "Stars",
      issues: "Issues",
      forks: "Forks",
    } as Record<DimensionKey, string>,
    colDimension: "Dimension",
    colRaw: "Raw",
    colNorm: "Level",
    colWeight: "Weight",
    colContribution: "Points",
    config: "Configure index",
    weights: "Weights",
    commits: "commits",
    merges: "pull requests",
    issueMode: "Issues mode",
    modeRatio: "Open/closed ratio",
    modeOpen: "Open issues only",
    xmaxMode: "Reference max",
    xmaxMax: "Maximum",
    xmaxP95: "95th percentile",
    weightSum: "Sum",
    reset: "Reset to defaults",
    na: "n/d",
    excluded: "excluded (no data)",
  },
  it: {
    section: "Attività",
    debugShow: "Mostra debug",
    debugHide: "Nascondi debug",
    groupCode: "Codice",
    groupCommunity: "Community",
    info: "Info",
    contributors: "Contributori",
    commitsAll: "Commit, totali",
    mergesAll: "Pull request, totali",
    commitsWindow: (d: number) => `Commit, ultimi ${d} giorni`,
    mergesWindow: (d: number) => `Pull request, ultimi ${d} giorni`,
    stars: "Stelle",
    forks: "Fork",
    issuesOpen: "Issue aperte",
    issuesClosed: "Issue chiuse",
    releases: "Release",
    oldestCommit: "Primo commit",
    dim: {
      contributors: "Contributori",
      history: "Storia del progetto",
      activity: "Attività recente",
      stars: "Stelle",
      issues: "Issue",
      forks: "Fork",
    } as Record<DimensionKey, string>,
    colDimension: "Dimensione",
    colRaw: "Grezzo",
    colNorm: "Livello",
    colWeight: "Peso",
    colContribution: "Punti",
    config: "Configura indice",
    weights: "Pesi",
    commits: "commit",
    merges: "pull request",
    issueMode: "Modalità issue",
    modeRatio: "Rapporto aperte/chiuse",
    modeOpen: "Solo issue aperte",
    xmaxMode: "Massimo di riferimento",
    xmaxMax: "Massimo",
    xmaxP95: "95° percentile",
    weightSum: "Somma",
    reset: "Ripristina default",
    na: "n/d",
    excluded: "esclusa (dati assenti)",
  },
};

type SubKey = keyof VitalityConfig["subWeights"];

const SPLIT: Partial<Record<DimensionKey, { c: SubKey; m: SubKey }>> = {
  history: { c: "phC", m: "phM" },
  activity: { c: "caC", m: "caM" },
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function mergeConfig(c: Partial<VitalityConfig> | null): VitalityConfig {
  return {
    weights: { ...DEFAULT_CONFIG.weights, ...(c?.weights ?? {}) },
    subWeights: { ...DEFAULT_CONFIG.subWeights, ...(c?.subWeights ?? {}) },
    issueMode: c?.issueMode === "open" ? "open" : "ratio",
    xmaxMode: c?.xmaxMode === "p95" ? "p95" : "max",
  };
}

function readConfig(): VitalityConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  const fromUrl = new URLSearchParams(window.location.search).get(URL_PARAM);
  const raw = fromUrl ?? window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_CONFIG;
  try {
    return mergeConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_CONFIG;
  }
}

function persist(config: VitalityConfig) {
  const isDefault = JSON.stringify(config) === JSON.stringify(DEFAULT_CONFIG);
  const params = new URLSearchParams(window.location.search);
  if (isDefault) {
    window.localStorage.removeItem(STORAGE_KEY);
    params.delete(URL_PARAM);
  } else {
    const serialized = JSON.stringify(config);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    params.set(URL_PARAM, serialized);
  }
  const qs = params.toString();
  history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

const fmt = (n: number | null | undefined, locale: string) =>
  typeof n === "number" ? n.toLocaleString(locale) : null;

interface Props {
  activity: SoftwareActivity;
  stats: CatalogStats | null;
  locale?: string;
}

export const SoftwareMetrics: React.FC<Props> = ({ activity, stats, locale = "en" }) => {
  const L = LABELS[locale === "it" ? "it" : "en"];
  const [config, setConfig] = useState<VitalityConfig>(() => readConfig());
  const [showDebug, setShowDebug] = useState(false);
  const [openSplits, setOpenSplits] = useState<Record<string, boolean>>({});

  useEffect(() => {
    persist(config);
  }, [config]);

  const result = useMemo(() => computeVitality(activity, stats, config), [activity, stats, config]);

  const win = activity.recentDays ?? 180;
  const code: [string, number | null][] = [
    [L.contributors, activity.contributors],
    [L.commitsAll, activity.commitsAllTime],
    [L.mergesAll, activity.pullRequestsAllTime],
    [L.commitsWindow(win), activity.commitsRecent],
    [L.mergesWindow(win), activity.pullRequestsRecent],
  ];
  const community: [string, number | null][] = [
    [L.stars, activity.stars ?? null],
    [L.forks, activity.forks ?? null],
    [L.issuesOpen, activity.issuesOpen ?? null],
    [L.issuesClosed, activity.issuesClosed ?? null],
  ];

  const setWeight = (key: DimensionKey, value: number) =>
    setConfig((c) => ({ ...c, weights: rebalanceWeights(c.weights, key, value) }));
  const setSplit = (edited: SubKey, other: SubKey, value: number) => {
    const v = round2(Math.max(0, Math.min(1, value)));
    setConfig((c) => ({ ...c, subWeights: { ...c.subWeights, [edited]: v, [other]: round2(1 - v) } }));
  };
  const toggleSplit = (key: DimensionKey) =>
    setOpenSplits((s) => ({ ...s, [key]: !s[key] }));

  const score = Math.round(result.score100);

  return (
    <section className="software-metrics">
      <h2><FontAwesomeIcon icon={faChartColumn} /> {L.section}</h2>

      <div className="metrics-grid">
        <div className="metrics-group">
          <h3>{L.groupCode}</h3>
          <dl>
            {code.map(([label, value]) => (
              <React.Fragment key={label}>
                <dt>{label}</dt>
                <dd className={value === null ? "is-na" : undefined}>{fmt(value, locale) ?? L.na}</dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
        <div className="metrics-group">
          <h3>{L.groupCommunity}</h3>
          <dl>
            {community.map(([label, value]) => (
              <React.Fragment key={label}>
                <dt>{label}</dt>
                <dd className={value === null ? "is-na" : undefined}>{fmt(value, locale) ?? L.na}</dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      </div>

      <p className="metrics-info">
        {L.releases}: <strong>{fmt(activity.releases, locale) ?? L.na}</strong>
        {activity.oldestCommit && <> &middot; {L.oldestCommit}: <strong>{activity.oldestCommit}</strong></>}
      </p>

      <div className="vitality-badge">
        <div className="vitality-score">
          <span className="vitality-value">{score}</span>
          <span className="vitality-max">/ 100</span>
        </div>
        <div className="vitality-meta">
          <div className="vitality-actions">
            <button type="button" onClick={() => setShowDebug((s) => !s)}>
              {showDebug ? L.debugHide : L.debugShow}
              <FontAwesomeIcon icon={faAngleDown} className={showDebug ? "rot" : undefined} />
            </button>
          </div>
        </div>
      </div>

      {showDebug && (
        <>
        <table className="vitality-debug">
          <thead>
            <tr>
              <th>{L.colDimension}</th>
              <th>{L.colRaw}</th>
              <th>{L.colNorm}</th>
              <th>{L.colWeight}</th>
              <th>{L.colContribution}</th>
            </tr>
          </thead>
          <tbody>
            {result.dimensions.map((d) => {
              const split = d.present ? SPLIT[d.key] : undefined;
              const open = split && openSplits[d.key];
              return (
                <React.Fragment key={d.key}>
                  <tr className={d.present ? undefined : "is-excluded"}>
                    <td>
                      {split ? (
                        <button type="button" className="vitality-split-toggle" aria-expanded={!!open} onClick={() => toggleSplit(d.key)}>
                          <FontAwesomeIcon icon={faAngleDown} className={open ? "rot" : undefined} />
                          {L.dim[d.key]}
                        </button>
                      ) : (
                        L.dim[d.key]
                      )}
                    </td>
                    {d.present ? (
                      <>
                        <td>{(d.raw as number).toLocaleString(locale, { maximumFractionDigits: 2 })}</td>
                        <td>
                          <span className="bar-track"><span className="bar-fill" style={{ width: `${(d.normalized as number) * 100}%` }} /></span>
                          {(d.normalized as number).toFixed(2)}
                        </td>
                        <td>
                          <input
                            type="number"
                            className="weight-input"
                            min={0}
                            max={100}
                            step={1}
                            value={Math.round(config.weights[d.key] * 100)}
                            onChange={(e) => setWeight(d.key, Number(e.target.value) / 100)}
                          />{" %"}
                        </td>
                        <td>{d.contribution.toFixed(1)}</td>
                      </>
                    ) : (
                      <td colSpan={4} className="is-na">{L.excluded}</td>
                    )}
                  </tr>
                  {open && split && (
                    <tr className="vitality-split-row">
                      <td colSpan={5}>
                        <div className="vitality-split">
                          <label>
                            <span>{L.commits}</span>
                            <input type="number" min={0} max={100} step={1} value={Math.round(config.subWeights[split.c] * 100)} onChange={(e) => setSplit(split.c, split.m, Number(e.target.value) / 100)} />{" %"}
                          </label>
                          <label>
                            <span>{L.merges}</span>
                            <input type="number" min={0} max={100} step={1} value={Math.round(config.subWeights[split.m] * 100)} onChange={(e) => setSplit(split.m, split.c, Number(e.target.value) / 100)} />{" %"}
                          </label>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}></td>
              <td></td>
              <td>{result.score100.toFixed(1)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="vitality-config">
          <div className="config-grid">
            <label>
              <span>{L.issueMode}</span>
              <select value={config.issueMode} onChange={(e) => setConfig((c) => ({ ...c, issueMode: e.target.value as VitalityConfig["issueMode"] }))}>
                <option value="ratio">{L.modeRatio}</option>
                <option value="open">{L.modeOpen}</option>
              </select>
            </label>
            <label>
              <span>{L.xmaxMode}</span>
              <select value={config.xmaxMode} onChange={(e) => setConfig((c) => ({ ...c, xmaxMode: e.target.value as VitalityConfig["xmaxMode"] }))}>
                <option value="max">{L.xmaxMax}</option>
                <option value="p95">{L.xmaxP95}</option>
              </select>
            </label>
          </div>

          <button type="button" className="vitality-reset" onClick={() => setConfig(DEFAULT_CONFIG)}>{L.reset}</button>
        </div>
        </>
      )}
    </section>
  );
};
