import React from "react";
import {
  useCapWarningVisibility,
  useOpenCodeBadgeVisibility,
} from "../lib/useVitalityConfig";
import { LABELS } from "../lib/vitalityLabels";

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
    enabled: capWarningsEnabled,
    ready: capWarningsReady,
    setEnabled: setCapWarningsEnabled,
  } = useCapWarningVisibility();
  const {
    enabled: openCodeBadgesEnabled,
    ready: openCodeBadgesReady,
    setEnabled: setOpenCodeBadgesEnabled,
  } = useOpenCodeBadgeVisibility();

  const ready = capWarningsReady && openCodeBadgesReady;

  return (
    <section className={`software-metrics activity-settings${ready ? "" : " is-loading"}`}>
      <div className="activity-preferences">
        <PreferenceToggle
          label={L.capWarning}
          enabled={capWarningsEnabled}
          onToggle={() => setCapWarningsEnabled(!capWarningsEnabled)}
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
