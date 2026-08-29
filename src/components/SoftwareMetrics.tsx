import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartColumn, faAngleDown, faHourglassHalf, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { computeActivityScore } from "../lib/activityScore";
import { formatDate, relativeDate } from "../lib/date.js";
import type { ForgeMetric } from "../types/analysis";
import { fieldState } from "../lib/activity.ts";
import { forgeMetricUrl } from "../lib/forgeLinks";
import { useActivityData } from "../lib/useActivityData";
import { useActivityDebugVisibility, usePageActivityConfig } from "../lib/useActivityConfig";
import { LABELS } from "../lib/activityLabels";
import { ActivityWeightsWidget } from "./ActivityWeightsWidget";

const fmt = (n: number | null | undefined, locale: string) =>
  typeof n === "number" ? n.toLocaleString(locale) : null;

type CodeRow =
  | { label: string; kind: "git"; value: number }
  | { label: string; kind: "forge"; key: ForgeMetric };

interface Props {
  softwareId: string;
  catalogId: string | null;
  locale?: string;
  repoUrl?: string | null;
  overview?: { href: string; label: string } | null;
}

export const SoftwareMetrics: React.FC<Props> = ({ softwareId, catalogId, locale = "en", repoUrl = null, overview = null }) => {
  const L = LABELS[locale === "it" ? "it" : "en"];
  const { activity, stats, loaded } = useActivityData(softwareId, catalogId);
  const { config, overridden, ready, setWeight, setSplit, setIssueMode, setXmaxMode, resetToGlobal } = usePageActivityConfig(softwareId);
  const { enabled: debugEnabled } = useActivityDebugVisibility();
  const [showDebug, setShowDebug] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const result = useMemo(
    () => (activity ? computeActivityScore(activity, stats, config) : null),
    [activity, stats, config],
  );

  if (loaded && !activity) return null;
  // An empty island has no box (astro-island is display: contents)
  // and a boxless client:visible island never intersects, so the
  // pre-fetch render must keep a visible shell.
  if (!activity || !result) return <section className="software-metrics" aria-busy="true" />;

  const confirmResetToGlobal = () => {
    if (window.confirm(L.resetGlobalConfirmation)) resetToGlobal();
  };

  const capped = result.score100 !== null && result.cap !== null && result.score100 === result.cap.limit;

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
  const forgeValue = (key: ForgeMetric, value: number) => {
    const href = forgeMetricUrl(repoUrl, key);
    const text = fmt(value, locale);
    return href ? <a href={href} target="_blank" rel="noopener noreferrer">{text}</a> : text;
  };

  return (
    <section className="software-metrics">
      <div className="software-metrics-head">
        <h2><FontAwesomeIcon icon={faChartColumn} /> {L.section}</h2>
        {overview && <a className="software-metrics-overview" href={overview.href}>{overview.label}</a>}
      </div>

      <div className="metrics-grid">
        <div className="metrics-group">
          <h3>{L.groupCode}</h3>
          <dl>
            {activity.oldestCommit && (() => {
              const d = formatDate(activity.oldestCommit, locale);
              if (!d) return null;
              return (
                <>
                  <dt>{L.oldestCommit}</dt>
                  <dd>
                    <time dateTime={d.datetime} title={hydrated ? d.formatted : undefined}>
                      {hydrated ? relativeDate(activity.oldestCommit, locale) : d.formatted}
                    </time>
                  </dd>
                </>
              );
            })()}
            {code.map((row) => {
              if (row.kind === "forge") {
                const fs = fieldState(activity, row.key);
                return (
                  <React.Fragment key={row.label}>
                    <dt>{row.label}</dt>
                    <dd className={fs.state === "value" ? undefined : "is-na"}>
                      {fs.state === "value" ? forgeValue(row.key, fs.value)
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
                    {fs.state === "value" ? forgeValue(key, fs.value)
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

      <div className={`activity-score-badge${showDebug ? " is-expanded" : ""}${capped ? " is-capped-unknown" : ""}${ready ? "" : " is-loading"}`}>
        <span className="activity-label">{L.scoreLabel}</span>
        {result.overAllocated ? (
          <div className="activity-score" title={L.overAllocatedTitle}>
            <span className="activity-value is-over-allocated">?</span>
            <span className="activity-max">/ 100</span>
          </div>
        ) : result.score100 === null ? (
          <p className="activity-unavailable"><FontAwesomeIcon icon={faHourglassHalf} /> {L.scorePending}</p>
        ) : (
          <div className="activity-score">
            <span className={`activity-value${overridden ? " is-custom" : ""}${capped ? " is-capped-unknown" : ""}`}>{Math.round(result.score100)}</span>
            <span className="activity-max">/ 100</span>
          </div>
        )}
        <div className="activity-score-meta">
          {overridden && (
            <span className="activity-override">
              <span>{L.overrideActive}</span>
              <button type="button" onClick={confirmResetToGlobal} title={L.resetGlobal} aria-label={L.resetGlobal}>
                <FontAwesomeIcon icon={faRotateLeft} />
              </button>
            </span>
          )}
          {capped && (
            <p className="activity-scope activity-cap-warning">
              {L.capDisabled}
            </p>
          )}
        </div>
        {debugEnabled && (
        <button type="button" className="activity-weights-toggle" onClick={() => setShowDebug((s) => !s)} aria-expanded={showDebug}>
          <span>{showDebug ? L.debugHide : L.debugShow}</span>
          <FontAwesomeIcon icon={faAngleDown} className={showDebug ? "rot" : undefined} />
        </button>
        )}

        {showDebug && debugEnabled && (
          <div className="activity-weights-panel">
            <ActivityWeightsWidget
              result={result}
              config={config}
              labels={L}
              locale={locale}
              onWeight={setWeight}
              onSplit={setSplit}
              onIssueMode={setIssueMode}
              onXmaxMode={setXmaxMode}
            />
          </div>
        )}
      </div>
    </section>
  );
};
