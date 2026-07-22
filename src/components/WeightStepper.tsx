import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";

interface Props {
  value: number;
  onChange: (pct: number) => void;
  decLabel: string;
  incLabel: string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export const WeightStepper: React.FC<Props> = ({ value, onChange, decLabel, incLabel }) => (
  <span className="weight-stepper">
    <button type="button" aria-label={decLabel} onClick={() => onChange(clamp(value - 1))}>
      <FontAwesomeIcon icon={faMinus} />
    </button>
    <input
      type="number"
      className="weight-input"
      min={0}
      max={100}
      step={1}
      value={value}
      onChange={(e) => onChange(clamp(Number(e.target.value)))}
    />
    <button type="button" aria-label={incLabel} onClick={() => onChange(clamp(value + 1))}>
      <FontAwesomeIcon icon={faPlus} />
    </button>
  </span>
);
