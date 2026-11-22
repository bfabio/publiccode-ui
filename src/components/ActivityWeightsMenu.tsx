import React, { useEffect, useId, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSliders, faXmark } from "@fortawesome/free-solid-svg-icons";
import { DIMENSION_ORDER, freeWeightPoints, type ActivityConfig, type DimensionKey } from "../lib/activityScore";
import { useActivityDebugVisibility, useGlobalActivityConfig } from "../lib/useActivityConfig";
import { isDefaultConfig } from "../lib/activityStore";
import { LABELS } from "../lib/activityLabels";
import { WeightStepper } from "./WeightStepper";

type SubKey = keyof ActivityConfig["subWeights"];

const SPLIT: Partial<Record<DimensionKey, { c: SubKey; m: SubKey }>> = {
  history: { c: "phC", m: "phM" },
  activity: { c: "caC", m: "caM" },
};

export const ActivityWeightsMenu: React.FC<{ locale?: string }> = ({ locale = "en" }) => {
  const L = LABELS[locale === "it" ? "it" : "en"];
  const [open, setOpen] = useState(() => {
    try { return sessionStorage.getItem("activity-drawer") === "1"; } catch { return false; }
  });
  // A drawer restored at page load must not replay its entrance, so the
  // slide-in only arms once the user toggles it in this page view.
  const [animated, setAnimated] = useState(false);
  const idBase = useId();
  const {
    config,
    ready,
    setWeight,
    setSplit,
    setIssueMode,
    setXmaxMode,
    reset,
  } = useGlobalActivityConfig();
  const { enabled: debugEnabled } = useActivityDebugVisibility();
  const shown = open && debugEnabled;

  useEffect(() => {
    document.documentElement.toggleAttribute("data-activity-drawer", shown);
    document.documentElement.toggleAttribute("data-activity-drawer-anim", shown && animated);
    try { sessionStorage.setItem("activity-drawer", open ? "1" : "0"); } catch {}
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.removeAttribute("data-activity-drawer");
      document.documentElement.removeAttribute("data-activity-drawer-anim");
      document.removeEventListener("keydown", onKey);
    };
  }, [open, shown, animated]);

  const confirmReset = () => {
    if (window.confirm(L.resetConfirmation)) reset();
  };
  const freePool = freeWeightPoints(config.weights);

  return (
    <>
      <button
        type="button"
        className="activity-weights-btn"
        aria-label={L.globalWeights}
        title={L.globalWeights}
        aria-haspopup="dialog"
        aria-expanded={shown}
        onClick={() => { setAnimated(true); setOpen((o) => !o); }}
      >
        <FontAwesomeIcon icon={faSliders} />
      </button>
      {shown && (
        <div className={`activity-weights-drawer${ready ? "" : " is-loading"}${animated ? " is-anim" : ""}`} role="dialog" aria-label={L.globalWeights}>
          <div className="activity-weights-drawer-head">
            <h3>{L.globalWeights}</h3>
            <button
              type="button"
              className="activity-weights-close"
              aria-label={L.popoverClose}
              title={L.popoverClose}
              onClick={() => setOpen(false)}
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
          <p className="settings-intro">{L.settingsIntro}</p>

          <table className="activity-debug">
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
                          label={`${L.colWeight}: ${L.dim[key]}`}
                          onChange={(pct) => setWeight(key, pct / 100)}
                          decLabel={L.stepDown}
                          incLabel={L.stepUp}
                        />{" %"}
                      </td>
                    </tr>
                    {split && (
                      <tr className="activity-split-row">
                        <td colSpan={2}>
                          <div className="activity-split">
                            <label htmlFor={`${idBase}-${key}-commits`}>
                              <span>{L.commits}</span>
                              <WeightStepper
                                id={`${idBase}-${key}-commits`}
                                label={`${L.colWeight}: ${L.dim[key]}, ${L.commits}`}
                                value={Math.round(config.subWeights[split.c] * 100)}
                                onChange={(pct) => setSplit(split.c, split.m, pct / 100)}
                                decLabel={L.stepDown}
                                incLabel={L.stepUp}
                              />{" %"}
                            </label>
                            <label htmlFor={`${idBase}-${key}-merges`}>
                              <span>{L.merges}</span>
                              <WeightStepper
                                id={`${idBase}-${key}-merges`}
                                label={`${L.colWeight}: ${L.dim[key]}, ${L.merges}`}
                                value={Math.round(config.subWeights[split.m] * 100)}
                                onChange={(pct) => setSplit(split.m, split.c, pct / 100)}
                                decLabel={L.stepDown}
                                incLabel={L.stepUp}
                              />{" %"}
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
                <td></td>
                <td>
                  <span className={`activity-free-points${freePool < 0 ? " is-over" : freePool > 0 ? " has-free" : " is-empty"}`}>
                    {(freePool < 0 ? L.freePointsOver : L.freePoints).replace("{points}", String(Math.abs(freePool)))}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="activity-config">
            <div className="config-grid">
              <label>
                <span>{L.issueMode}</span>
                <select value={config.issueMode} onChange={(e) => setIssueMode(e.target.value as ActivityConfig["issueMode"])}>
                  <option value="ratio">{L.modeRatio}</option>
                  <option value="open">{L.modeOpen}</option>
                </select>
              </label>
              <label>
                <span>{L.xmaxMode}</span>
                <select value={config.xmaxMode} onChange={(e) => setXmaxMode(e.target.value as ActivityConfig["xmaxMode"])}>
                  <option value="max">{L.xmaxMax}</option>
                  <option value="p95">{L.xmaxP95}</option>
                </select>
              </label>
            </div>

            {!isDefaultConfig(config) && (
              <button type="button" className="activity-reset" onClick={confirmReset}>{L.reset}</button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
