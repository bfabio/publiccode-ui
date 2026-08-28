import React from "react";
import {
  useActivityDebugVisibility,
  useOpenCodeBadgeVisibility,
} from "../lib/useActivityConfig";
import { LABELS } from "../lib/activityLabels";

interface PreferenceToggleProps {
  label: string;
  description?: string;
  enabled: boolean;
  onToggle: () => void;
}

const PreferenceToggle: React.FC<PreferenceToggleProps> = ({ label, description, enabled, onToggle }) => (
  <div className="settings-preference">
    <span>
      <strong>{label}</strong>
      {description && <small>{description}</small>}
    </span>
    <button
      type="button"
      className={`settings-switch${enabled ? " is-on" : ""}`}
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onToggle}
    >
      <span aria-hidden="true" />
    </button>
  </div>
);

export const ActivitySettings: React.FC<{ locale?: string }> = ({ locale = "en" }) => {
  const L = LABELS[locale === "it" ? "it" : "en"];
  const {
    enabled: activityDebugEnabled,
    ready: activityDebugReady,
    setEnabled: setActivityDebugEnabled,
  } = useActivityDebugVisibility();
  const {
    enabled: openCodeBadgesEnabled,
    ready: openCodeBadgesReady,
    setEnabled: setOpenCodeBadgesEnabled,
  } = useOpenCodeBadgeVisibility();

  const ready = activityDebugReady && openCodeBadgesReady;

  return (
    <section className={`software-metrics activity-settings${ready ? "" : " is-loading"}`}>
      <div className="activity-preferences">
        <PreferenceToggle
          label={L.activityDebug}
          description={L.activityDebugHelp}
          enabled={activityDebugEnabled}
          onToggle={() => setActivityDebugEnabled(!activityDebugEnabled)}
        />
        <PreferenceToggle
          label={L.openCodeBadges}
          description={L.openCodeBadgesHelp}
          enabled={openCodeBadgesEnabled}
          onToggle={() => setOpenCodeBadgesEnabled(!openCodeBadgesEnabled)}
        />
      </div>
    </section>
  );
};
