import React, { useMemo } from "react";
import { computeActivityScore } from "../lib/activityScore";
import { useActivityData } from "../lib/useActivityData";
import { usePageActivityConfig } from "../lib/useActivityConfig";
import { LABELS } from "../lib/activityLabels";

interface Props {
  softwareId: string;
  catalogId: string | null;
  locale?: string;
}

const size = 300;
const center = size / 2;
const radius = 90;

const point = (angle: number, distance: number) =>
  `${center + distance * Math.cos(angle)},${center + distance * Math.sin(angle)}`;

const xy = (angle: number, distance: number) => ({
  x: center + distance * Math.cos(angle),
  y: center + distance * Math.sin(angle),
});

export const ActivityRadar: React.FC<Props> = ({ softwareId, catalogId, locale = "en" }) => {
  const labels = LABELS[locale === "it" ? "it" : "en"];
  const { activity, stats, loaded } = useActivityData(softwareId, catalogId);
  const { config, ready } = usePageActivityConfig(softwareId);
  const dimensions = useMemo(
    () => (activity ? computeActivityScore(activity, stats, config).dimensions
      .filter((dimension) => dimension.present && dimension.normalized !== null)
      .map((dimension) => ({ label: labels.dim[dimension.key], value: dimension.normalized ?? 0 })) : []),
    [activity, config, labels.dim, stats],
  );
  const axes = dimensions.map((dimension, index) => ({
    ...dimension,
    angle: (Math.PI * 2 * index) / dimensions.length - Math.PI / 2,
  }));
  const rings = [1, 2, 3, 4, 5].map((level) =>
    axes.map((axis) => point(axis.angle, (radius * level) / 5)).join(" "),
  );
  const data = axes.map((axis) => point(axis.angle, radius * axis.value)).join(" ");

  return (
    <div className={`activity-radar${ready && loaded ? "" : " is-loading"}`}>
      {axes.length > 0 ? (
        <svg className="radar-chart" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={labels.section}>
          {rings.map((points) => <polygon key={points} points={points} className="radar-ring" />)}
          {axes.map((axis) => {
            const to = xy(axis.angle, radius);
            return <line key={axis.label} x1={center} y1={center} x2={to.x} y2={to.y} className="radar-axis" />;
          })}
          <polygon points={data} className="radar-fill" />
          {axes.map((axis) => {
            const position = xy(axis.angle, radius + 24);
            return <text key={axis.label} x={position.x} y={position.y} className="radar-label" textAnchor="middle" dominantBaseline="central">{axis.label}</text>;
          })}
        </svg>
      ) : loaded ? <p className="radar-empty">{labels.scorePending}</p> : null}
    </div>
  );
};
