import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartColumn } from "@fortawesome/free-solid-svg-icons";
import { DIMENSION_ORDER, type VitalityConfig, type DimensionKey } from "../lib/vitality";
import { useGlobalActivityConfig } from "../lib/useVitalityConfig";
import { LABELS } from "../lib/vitalityLabels";
import { WeightStepper } from "./WeightStepper";

type SubKey = keyof VitalityConfig["subWeights"];

const SPLIT: Partial<Record<DimensionKey, { c: SubKey; m: SubKey }>> = {
  history: { c: "phC", m: "phM" },
  activity: { c: "caC", m: "caM" },
};

export const ActivitySettings: React.FC<{ locale?: string }> = ({ locale = "en" }) => {
  const L = LABELS[locale === "it" ? "it" : "en"];
  const { config, setWeight, setSplit, setIssueMode, setXmaxMode, reset } = useGlobalActivityConfig();

  return (
    <section className="software-metrics activity-settings">
      <h2><FontAwesomeIcon icon={faChartColumn} /> {L.section}</h2>
      <p className="settings-intro">{L.settingsIntro}</p>

      <table className="vitality-debug">
        <thead>
          <tr>
            <th>{L.colDimension}</th>
            <th>{L.colWeight}</th>
          </tr>
        </thead>
        <tbody>
          {DIMENSION_ORDER.map((key) => {
            const split = SPLIT[key];
            return (
              <React.Fragment key={key}>
                <tr>
                  <td>{L.dim[key]}</td>
                  <td>
                    <WeightStepper
                      value={Math.round(config.weights[key] * 100)}
                      onChange={(pct) => setWeight(key, pct / 100)}
                      decLabel={L.stepDown}
                      incLabel={L.stepUp}
                    />{" %"}
                  </td>
                </tr>
                {split && (
                  <tr className="vitality-split-row">
                    <td colSpan={2}>
                      <div className="vitality-split">
                        <label>
                          <span>{L.commits}</span>
                          <WeightStepper value={Math.round(config.subWeights[split.c] * 100)} onChange={(pct) => setSplit(split.c, split.m, pct / 100)} decLabel={L.stepDown} incLabel={L.stepUp} />{" %"}
                        </label>
                        <label>
                          <span>{L.merges}</span>
                          <WeightStepper value={Math.round(config.subWeights[split.m] * 100)} onChange={(pct) => setSplit(split.m, split.c, pct / 100)} decLabel={L.stepDown} incLabel={L.stepUp} />{" %"}
                        </label>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
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

        <button type="button" className="vitality-reset" onClick={reset}>{L.reset}</button>
      </div>
    </section>
  );
};
