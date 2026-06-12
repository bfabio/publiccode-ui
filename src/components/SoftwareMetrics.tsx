import React, { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartColumn, faAngleDown } from "@fortawesome/free-solid-svg-icons";
import { computeVitality, type VitalityConfig, type DimensionKey } from "../lib/vitality";
import type { SoftwareActivity, CatalogStats, ForgeMetric } from "../types/analysis";
import { fieldState } from "../lib/activity.ts";
import { usePageActivityConfig } from "../lib/useVitalityConfig";
import { LABELS } from "../lib/vitalityLabels";

type SubKey = keyof VitalityConfig["subWeights"];

const SPLIT: Partial<Record<DimensionKey, { c: SubKey; m: SubKey }>> = {
  history: { c: "phC", m: "phM" },
  activity: { c: "caC", m: "caM" },
};

const fmt = (n: number | null | undefined, locale: string) =>
  typeof n === "number" ? n.toLocaleString(locale) : null;

type CodeRow =
  | { label: string; kind: "git"; value: number }
  | { label: string; kind: "forge"; key: ForgeMetric };

interface Props {
  activity: SoftwareActivity;
  stats: CatalogStats | null;
  locale?: string;
}

export const SoftwareMetrics: React.FC<Props> = ({ activity, stats, locale = "en" }) => {
  const L = LABELS[locale === "it" ? "it" : "en"];
  const { config, overridden, setWeight, setSplit, setIssueMode, setXmaxMode, resetToGlobal } = usePageActivityConfig();
  const [showDebug, setShowDebug] = useState(false);
  const [openSplits, setOpenSplits] = useState<Record<string, boolean>>({});

  const result = useMemo(() => computeVitality(activity, stats, config), [activity, stats, config]);

  const win = activity.recentDays ?? 180;
  const code: CodeRow[] = [
    { label: L.contributors, kind: "git", value: activity.contributors },
    { label: L.commitsAll, kind: "git", value: activity.commitsAllTime },
    { label: L.mergesAll, kind: "forge", key: "pullRequestsAllTime" },
    { label: L.commitsWindow(win), kind: "git", value: activity.commitsRecent },
    { label: L.mergesWindow(win), kind: "forge", key: "pullRequestsRecent" },
  ];
  const community: [string, ForgeMetric][] = [
    [L.stars, "stars"],
    [L.forks, "forks"],
    [L.issuesOpen, "issuesOpen"],
    [L.issuesClosed, "issuesClosed"],
  ];

  const toggleSplit = (key: DimensionKey) =>
    setOpenSplits((s) => ({ ...s, [key]: !s[key] }));

  return (
    <section className="software-metrics">
      <h2><FontAwesomeIcon icon={faChartColumn} /> {L.section}</h2>

      <div className="metrics-grid">
        <div className="metrics-group">
          <h3>{L.groupCode}</h3>
          <dl>
            {code.map((row) => {
              if (row.kind === "forge") {
                const fs = fieldState(activity, row.key);
                return (
                  <React.Fragment key={row.label}>
                    <dt>{row.label}</dt>
                    <dd className={fs.state === "value" ? undefined : "is-na"}>
                      {fs.state === "value" ? fmt(fs.value, locale)
                        : fs.state === "unavailable" ? L.unavailable
                        : fs.state === "disabled" ? L.rowDisabled
                        : L.rowUnknown}
                    </dd>
                  </React.Fragment>
                );
              }
              return (
                <React.Fragment key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{fmt(row.value, locale)}</dd>
                </React.Fragment>
              );
            })}
          </dl>
        </div>
        <div className="metrics-group">
          <h3>{L.groupCommunity}</h3>
          <dl>
            {community.map(([label, key]) => {
              const fs = fieldState(activity, key);
              return (
                <React.Fragment key={label}>
                  <dt>{label}</dt>
                  <dd className={fs.state === "value" ? undefined : "is-na"}>
                    {fs.state === "value" ? fmt(fs.value, locale)
                      : fs.state === "unavailable" ? L.unavailable
                      : fs.state === "disabled" ? L.rowDisabled
                      : L.rowUnknown}
                  </dd>
                </React.Fragment>
              );
            })}
          </dl>
        </div>
      </div>

      <p className="metrics-info">
        {L.tags}: <strong>{fmt(activity.tags, locale) ?? L.na}</strong>
        {activity.oldestCommit && <> &middot; {L.oldestCommit}: <strong>{activity.oldestCommit}</strong></>}
      </p>

      <div className="vitality-badge">
        {result.score100 === null ? (
          <p className="vitality-unavailable">{L.scoreUnavailable}</p>
        ) : (
          <div className="vitality-score">
            <span className="vitality-value">{Math.round(result.score100)}</span>
            <span className="vitality-max">/ 100</span>
          </div>
        )}
        <div className="vitality-meta">
          {result.score100 !== null && result.cap && result.score100 === result.cap.limit && (
            <p className="vitality-scope">
              {result.cap.reason === "disabled" ? L.capDisabled : L.capUnknown}
            </p>
          )}
          {result.score100 !== null && result.covered < result.total && (
            <p className="vitality-scope">{L.scoreScope(result.covered, result.total)}</p>
          )}
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
              <td>{result.score100 === null ? L.na : result.score100.toFixed(1)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="vitality-config">
          <div className="config-grid">
            <label>
              <span>{L.issueMode}</span>
              <select value={config.issueMode} onChange={(e) => setIssueMode(e.target.value as VitalityConfig["issueMode"])}>
                <option value="ratio">{L.modeRatio}</option>
                <option value="open">{L.modeOpen}</option>
              </select>
            </label>
            <label>
              <span>{L.xmaxMode}</span>
              <select value={config.xmaxMode} onChange={(e) => setXmaxMode(e.target.value as VitalityConfig["xmaxMode"])}>
                <option value="max">{L.xmaxMax}</option>
                <option value="p95">{L.xmaxP95}</option>
              </select>
            </label>
          </div>

          {overridden && (
            <button type="button" className="vitality-reset" onClick={resetToGlobal}>{L.resetGlobal}</button>
          )}
        </div>
        </>
      )}
    </section>
  );
};
