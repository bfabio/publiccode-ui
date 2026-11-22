import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";

interface Props {
  value: number;
  label: string;
  // A label wrapping the stepper must point at the input by id: without
  // it the label targets the first button, and a click on the label text
  // decrements the weight.
  id?: string;
  onChange: (pct: number) => void;
  decLabel: string;
  incLabel: string;
  max?: number;
}

export const WeightStepper: React.FC<Props> = ({ value, label, id, onChange, decLabel, incLabel, max = 100 }) => {
  const clamp = (n: number) => Math.max(0, Math.min(max, n));
  return (
    <span className="weight-stepper">
      <button type="button" aria-label={`${decLabel}: ${label}`} disabled={value <= 0} onClick={() => onChange(clamp(value - 1))}>
        <FontAwesomeIcon icon={faMinus} />
      </button>
      <input
        type="number"
        id={id}
        aria-label={label}
        className="weight-input"
        min={0}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
      />
      <button type="button" aria-label={`${incLabel}: ${label}`} disabled={value >= max} onClick={() => onChange(clamp(value + 1))}>
        <FontAwesomeIcon icon={faPlus} />
      </button>
    </span>
  );
};
