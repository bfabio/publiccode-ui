import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons";
import { DIMENSION_ORDER, freeWeightPoints, type DimensionKey, type DimensionState, type VitalityConfig, type VitalityResult } from "../lib/vitality";
import { LABELS } from "../lib/vitalityLabels";
import { WeightStepper } from "./WeightStepper";

type SubKey = keyof VitalityConfig["subWeights"];
type Labels = typeof LABELS.en;

const SPLIT: Partial<Record<DimensionKey, { c: SubKey; m: SubKey }>> = {
  history: { c: "phC", m: "phM" },
  activity: { c: "caC", m: "caM" },
};

interface Props {
  result: VitalityResult;
  config: VitalityConfig;
  labels: Labels;
  locale: string;
  onWeight: (key: DimensionKey, value: number) => void;
  onSplit: (edited: SubKey, other: SubKey, value: number) => void;
  onIssueMode: (mode: VitalityConfig["issueMode"]) => void;
  onXmaxMode: (mode: VitalityConfig["xmaxMode"]) => void;
}

const PIE_W = 420;
const PIE_H = 180;
const PIE_CX = PIE_W / 2;
const PIE_CY = PIE_H / 2;
const PIE_R = 56;
const CALLOUT_ELBOW_R = PIE_R + 12;
const CALLOUT_TAIL_X = PIE_R + 30;
const CALLOUT_ROW_GAP = 15;

const polar = (angle: number, radius: number) => ({
  x: +(PIE_CX + radius * Math.cos(angle)).toFixed(1),
  y: +(PIE_CY + radius * Math.sin(angle)).toFixed(1),
});

const slicePath = (start: number, end: number) => {
  const from = polar(start, PIE_R);
  const to = polar(end, PIE_R);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return `M ${PIE_CX} ${PIE_CY} L ${from.x} ${from.y} A ${PIE_R} ${PIE_R} 0 ${largeArc} 1 ${to.x} ${to.y} Z`;
};

// Callout labels stack per side: keep the slice's natural height where
// possible, push overlapping neighbours down, then pull the pile back up
// when it runs past the bottom edge.
const layoutCallouts = <T extends { natural: number; y: number }>(items: T[]) => {
  const sorted = [...items].sort((a, b) => a.natural - b.natural);
  let previous = 13 - CALLOUT_ROW_GAP;
  for (const item of sorted) {
    item.y = Math.max(item.natural, previous + CALLOUT_ROW_GAP);
    previous = item.y;
  }
  let next = PIE_H - 9 + CALLOUT_ROW_GAP;
  for (const item of [...sorted].reverse()) {
    item.y = Math.min(item.y, next - CALLOUT_ROW_GAP);
    next = item.y;
  }
};

export const VitalityWeightDistribution: React.FC<Pick<Props, "config" | "labels"> & { result?: VitalityResult }> = ({ config, labels: L, result }) => {
  const points = result ? new Map(result.dimensions.map((d) => [d.key, d])) : null;
  const dimOf = (key: DimensionKey) => points?.get(key);
  const valueOf = (key: DimensionKey): number | null => {
    if (!points) return config.weights[key];
    const dim = dimOf(key);
    return dim && dim.present && dim.normalized !== null ? dim.contribution : null;
  };
  const orderedKeys = [...DIMENSION_ORDER].sort((a, b) => (valueOf(b) ?? -1) - (valueOf(a) ?? -1));
  const free = points ? 0 : freeWeightPoints(config.weights);
  const freeLabel = (free < 0 ? L.freePointsOver : L.freePoints).replace("{points}", String(Math.abs(free)));
  const display = (key: DimensionKey) => {
    const value = valueOf(key) as number;
    return points ? String(Math.round(value)) : `${Math.round(value * 100)}%`;
  };
  const patternId = React.useId();

  const sliceKeys: Array<DimensionKey | "free"> = orderedKeys.filter((key) => (valueOf(key) ?? 0) > 0);
  if (!points && free > 0) sliceKeys.push("free");
  const sliceValue = (key: DimensionKey | "free") =>
    key === "free" ? free : points ? (valueOf(key) as number) : (valueOf(key) as number) * 100;
  const total = sliceKeys.reduce((sum, key) => sum + sliceValue(key), 0);

  let angle = -Math.PI / 2;
  const arcs = sliceKeys.map((key) => {
    const start = angle;
    angle += (sliceValue(key) / total) * Math.PI * 2;
    const mid = (start + angle) / 2;
    return {
      key,
      start,
      end: angle,
      mid,
      side: Math.cos(mid) >= 0 ? 1 : -1,
      natural: PIE_CY + (PIE_R + 16) * Math.sin(mid),
      y: 0,
    };
  });
  layoutCallouts(arcs.filter((arc) => arc.side === 1));
  layoutCallouts(arcs.filter((arc) => arc.side === -1));

  return (
  <div className="vitality-weight-distribution">
    {arcs.length > 0 && !points && (
      <div className="vitality-weight-title">{L.weights}</div>
    )}
    {arcs.length > 0 && (
      <svg className="vitality-weight-pie" viewBox={`0 0 ${PIE_W} ${PIE_H}`} role="list" aria-label={L.weights}>
        {!points && free > 0 && (
          <defs>
            <pattern id={patternId} className="is-free" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect className="vitality-weight-pattern-bg" width="6" height="6" />
              <rect className="vitality-weight-pattern-fg" width="3" height="6" />
            </pattern>
          </defs>
        )}
        {arcs.map((arc) => {
          const aria = arc.key === "free" ? freeLabel : `${L.dim[arc.key]}: ${display(arc.key)}`;
          const style: React.CSSProperties = {
            "--pop": `translate(${(4 * Math.cos(arc.mid)).toFixed(1)}px, ${(4 * Math.sin(arc.mid)).toFixed(1)}px)`,
            ...(arc.key === "free" ? { fill: `url(#${patternId})` } : null),
          } as React.CSSProperties;
          return arcs.length === 1 ? (
            <circle key={arc.key} className={`vitality-weight-segment is-${arc.key}`} cx={PIE_CX} cy={PIE_CY} r={PIE_R} role="listitem" aria-label={aria} style={style} />
          ) : (
            <path key={arc.key} className={`vitality-weight-segment is-${arc.key}`} d={slicePath(arc.start, arc.end)} role="listitem" aria-label={aria} style={style} />
          );
        })}
        {arcs.map((arc) => {
          const anchor = polar(arc.mid, PIE_R - 1);
          const elbowX = +(PIE_CX + CALLOUT_ELBOW_R * Math.cos(arc.mid)).toFixed(1);
          const tailX = PIE_CX + arc.side * CALLOUT_TAIL_X;
          const y = +arc.y.toFixed(1);
          return (
            <g key={arc.key} className={`vitality-weight-legend-item is-${arc.key}`} aria-hidden="true">
              <polyline className="vitality-weight-callout" points={`${anchor.x},${anchor.y} ${elbowX},${y} ${tailX},${y}`} />
              <text className="vitality-weight-legend-label" x={tailX + arc.side * 5} y={y} dy="0.35em" textAnchor={arc.side === 1 ? "start" : "end"}>
                {arc.key === "free" ? freeLabel : L.dim[arc.key]}
                {arc.key !== "free" && <tspan className="vitality-weight-legend-value" dx="5">{display(arc.key)}</tspan>}
              </text>
            </g>
          );
        })}
      </svg>
    )}
  </div>
  );
};

export const VitalityWeightsWidget: React.FC<Props> = ({
  result,
  config,
  labels: L,
  locale,
  onWeight,
  onSplit,
  onIssueMode,
  onXmaxMode,
}) => {
  const [openSplits, setOpenSplits] = useState<Record<string, boolean>>({});
  const toggleSplit = (key: DimensionKey) => setOpenSplits((current) => ({ ...current, [key]: !current[key] }));
  const freePool = freeWeightPoints(config.weights);
  const stateTitleOf = (state: DimensionState) =>
    state === "failed" ? L.stateFailedTitle : state === "disabled" ? L.rowDisabled : L.stateUnknownTitle;

  return (
    <>
      <VitalityWeightDistribution config={config} labels={L} result={result} />

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
          {result.dimensions.map((dimension) => {
            const split = dimension.present ? SPLIT[dimension.key] : undefined;
            const open = split && openSplits[dimension.key];
            return (
              <React.Fragment key={dimension.key}>
                <tr className={dimension.present ? undefined : "is-excluded"}>
                  <td>
                    {split ? (
                      <button type="button" className="vitality-split-toggle" aria-expanded={!!open} onClick={() => toggleSplit(dimension.key)}>
                        <FontAwesomeIcon icon={faAngleDown} className={open ? "rot" : undefined} />
                        {L.dim[dimension.key]}
                      </button>
                    ) : L.dim[dimension.key]}
                  </td>
                  {dimension.present ? (
                    <>
                      <td>
                        {dimension.rawParts
                          ? `${dimension.rawParts.open.toLocaleString(locale)}/${dimension.rawParts.closed.toLocaleString(locale)}`
                          : (dimension.raw as number).toLocaleString(locale, { maximumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className="bar-track"><span className="bar-fill" style={{ width: `${(dimension.normalized as number) * 100}%` }} /></span>
                        {(dimension.normalized as number).toFixed(2)}
                      </td>
                      <td>
                        <WeightStepper
                          value={Math.round(config.weights[dimension.key] * 100)}
                          onChange={(pct) => onWeight(dimension.key, pct / 100)}
                          decLabel={L.stepDown}
                          incLabel={L.stepUp}
                        />{" %"}
                      </td>
                      <td>{dimension.contribution.toFixed(1)}</td>
                    </>
                  ) : (
                    <td colSpan={4} className="is-na">
                      {L.excluded} ({stateTitleOf(dimension.state)})
                    </td>
                  )}
                </tr>
                {open && split && (
                  <tr className="vitality-split-row">
                    <td colSpan={5}>
                      <div className="vitality-split">
                        <label>
                          <span>{L.commits}</span>
                          <WeightStepper value={Math.round(config.subWeights[split.c] * 100)} onChange={(pct) => onSplit(split.c, split.m, pct / 100)} decLabel={L.stepDown} incLabel={L.stepUp} />{" %"}
                        </label>
                        <label>
                          <span>{L.merges}</span>
                          <WeightStepper value={Math.round(config.subWeights[split.m] * 100)} onChange={(pct) => onSplit(split.m, split.c, pct / 100)} decLabel={L.stepDown} incLabel={L.stepUp} />{" %"}
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
            <td>
              <span className={`vitality-free-points${freePool < 0 ? " is-over" : freePool > 0 ? " has-free" : " is-empty"}`}>
                {(freePool < 0 ? L.freePointsOver : L.freePoints).replace("{points}", String(Math.abs(freePool)))}
              </span>
            </td>
            <td>
              {result.overAllocated
                ? <span title={L.overAllocatedTitle}>?</span>
                : result.score100 === null
                  ? <span title={L.scorePendingTitle}>{L.stateUnknown}</span>
                  : result.score100.toFixed(1)}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="vitality-config">
        <div className="config-grid">
          <label>
            <span>{L.issueMode}</span>
            <select value={config.issueMode} onChange={(e) => onIssueMode(e.target.value as VitalityConfig["issueMode"])}>
              <option value="ratio">{L.modeRatio}</option>
              <option value="open">{L.modeOpen}</option>
            </select>
          </label>
          <label>
            <span>{L.xmaxMode}</span>
            <select value={config.xmaxMode} onChange={(e) => onXmaxMode(e.target.value as VitalityConfig["xmaxMode"])}>
              <option value="max">{L.xmaxMax}</option>
              <option value="p95">{L.xmaxP95}</option>
            </select>
          </label>
        </div>
      </div>
    </>
  );
};
