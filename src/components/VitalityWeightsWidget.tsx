import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons";
import { DIMENSION_ORDER, type DimensionKey, type VitalityConfig, type VitalityResult } from "../lib/vitality";
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

export const VitalityWeightDistribution: React.FC<Pick<Props, "config" | "labels">> = ({ config, labels: L }) => (
  <div className="vitality-weight-distribution">
    <div className="vitality-weight-bar" role="list" aria-label={L.weights}>
      {DIMENSION_ORDER.map((key) => {
        const percentage = Math.round(config.weights[key] * 100);
        const label = `${L.dim[key]}: ${percentage}%`;
        return (
          <span
            key={key}
            className={`vitality-weight-segment is-${key}`}
            style={{ flexGrow: percentage, flexBasis: 0 }}
            role="listitem"
            title={label}
            aria-label={label}
          />
        );
      })}
    </div>
  </div>
);

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

  return (
    <>
      <VitalityWeightDistribution config={config} labels={L} />

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
                      <td>{(dimension.raw as number).toLocaleString(locale, { maximumFractionDigits: 2 })}</td>
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
                  ) : <td colSpan={4} className="is-na">{L.excluded}</td>}
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
            <td></td>
            <td>{result.score100 === null ? L.na : result.score100.toFixed(1)}</td>
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
