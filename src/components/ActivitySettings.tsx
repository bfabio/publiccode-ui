import React, { useEffect, useState } from "react";
import {
  useActivityDebugVisibility,
  useGlobalActivityConfig,
  useOpenCodeBadgeVisibility,
} from "../lib/useActivityConfig";
import { LABELS } from "../lib/activityLabels";
import { sharedConfigUrl } from "../lib/activityStore";

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

const ShareWeights: React.FC<{ homePath: string; L: (typeof LABELS)["en"] }> = ({ homePath, L }) => {
  const { config, shared, ready, keepShared, discardShared } = useGlobalActivityConfig();
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopied(false), [config]);

  const link = ready
    ? sharedConfigUrl(new URL(homePath, window.location.origin).toString(), config)
    : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Without clipboard access the link stays selectable in the field.
      setCopied(false);
    }
  };

  return (
    <div className="settings-share">
      <div className="settings-preference">
        <span>
          <strong>{L.shareWeights}</strong>
          <small>{L.shareWeightsHelp}</small>
        </span>
        <button type="button" onClick={copy} disabled={!ready}>
          {copied ? L.linkCopied : L.copyLink}
        </button>
      </div>
      <input
        type="text"
        className="settings-share-link"
        readOnly
        value={link}
        aria-label={L.shareWeights}
        onFocus={(e) => e.currentTarget.select()}
      />
      {shared && (
        <p className="settings-share-notice" role="status">
          {L.sharedActive}{" "}
          <button type="button" onClick={keepShared}>{L.keepShared}</button>{" "}
          <button type="button" onClick={discardShared}>{L.discardShared}</button>
        </p>
      )}
    </div>
  );
};

export const ActivitySettings: React.FC<{ locale?: string; homePath?: string }> = ({ locale = "en", homePath = "/" }) => {
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
      <ShareWeights homePath={homePath} L={L} />
    </section>
  );
};
