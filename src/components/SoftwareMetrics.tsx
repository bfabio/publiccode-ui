import React, { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartColumn, faAngleDown, faRotateLeft, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { computeVitality } from "../lib/vitality";
import type { SoftwareActivity, CatalogStats, ForgeMetric } from "../types/analysis";
import { fieldState } from "../lib/activity.ts";
import { useCapWarningVisibility, usePageActivityConfig } from "../lib/useVitalityConfig";
import { LABELS } from "../lib/vitalityLabels";
import { VitalityWeightsWidget } from "./VitalityWeightsWidget";

const fmt = (n: number | null | undefined, locale: string) =>
  typeof n === "number" ? n.toLocaleString(locale) : null;

type CodeRow =
  | { label: string; kind: "git"; value: number }
  | { label: string; kind: "forge"; key: ForgeMetric };

interface Props {
  softwareId: string;
  activity: SoftwareActivity;
  stats: CatalogStats | null;
  locale?: string;
}

export const SoftwareMetrics: React.FC<Props> = ({ softwareId, activity, stats, locale = "en" }) => {
  const L = LABELS[locale === "it" ? "it" : "en"];
  const { config, overridden, ready, setWeight, setSplit, setIssueMode, setXmaxMode, resetToGlobal } = usePageActivityConfig(softwareId);
  const { enabled: capWarningsEnabled, ready: capWarningsReady } = useCapWarningVisibility();
  const [showDebug, setShowDebug] = useState(false);

  const confirmResetToGlobal = () => {
    if (window.confirm(L.resetGlobalConfirmation)) resetToGlobal();
  };

  const result = useMemo(() => computeVitality(activity, stats, config), [activity, stats, config]);
  const hasUnknownCap = result.score100 !== null && result.cap?.reason === "unknown" && result.score100 === result.cap.limit;
  const showCapWarning = capWarningsReady && capWarningsEnabled && hasUnknownCap;

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

      <div className={`vitality-badge${showDebug ? " is-expanded" : ""}${showCapWarning ? " is-capped-unknown" : ""}${ready ? "" : " is-loading"}`}>
        {result.score100 === null ? (
          <p className="vitality-unavailable">{L.scoreUnavailable}</p>
        ) : (
          <div className="vitality-score">
            <span className={`vitality-value${overridden ? " is-custom" : ""}${showCapWarning ? " is-capped-unknown" : ""}`}>{Math.round(result.score100)}</span>
            <span className="vitality-max">/ 100</span>
          </div>
        )}
        <div className="vitality-meta">
          {overridden && (
            <span className="vitality-override">
              <span>{L.overrideActive}</span>
              <button type="button" onClick={confirmResetToGlobal} title={L.resetGlobal} aria-label={L.resetGlobal}>
                <FontAwesomeIcon icon={faRotateLeft} />
              </button>
            </span>
          )}
          {result.score100 !== null && result.cap && result.score100 === result.cap.limit && (
            <p className={`vitality-scope${showCapWarning ? " vitality-cap-warning" : ""}`}>
              {showCapWarning && <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden="true" />}
              {result.cap.reason === "disabled" ? L.capDisabled : L.capUnknown}
            </p>
          )}
          {result.score100 !== null && result.covered < result.total && (
            <p className="vitality-scope">{L.scoreScope(result.covered, result.total)}</p>
          )}
        </div>
        <button type="button" className="vitality-weights-toggle" onClick={() => setShowDebug((s) => !s)} aria-expanded={showDebug}>
          <span>{showDebug ? L.debugHide : L.debugShow}</span>
          <FontAwesomeIcon icon={faAngleDown} className={showDebug ? "rot" : undefined} />
        </button>

        {showDebug && (
          <div className="vitality-weights-panel">
            <VitalityWeightsWidget
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
