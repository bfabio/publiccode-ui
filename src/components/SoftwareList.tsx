import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGavel, faRotateLeft, faSliders, faTriangleExclamation, faXmark } from "@fortawesome/free-solid-svg-icons";
import { faCalendar } from "@fortawesome/free-regular-svg-icons";
import { formatDate } from "../lib/date.js";
import { computeVitality } from "../lib/vitality";
import { useActivityConfigs, useCapWarningVisibility } from "../lib/useVitalityConfig";
import { withActivityConfig } from "../lib/vitalityStore";
import type { SoftwareActivity, CatalogStats } from "../types/analysis";
import { LABELS as VITALITY_LABELS } from "../lib/vitalityLabels";
import { VitalityWeightsWidget } from "./VitalityWeightsWidget";

function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return <>{text.slice(0, idx)}<mark>{text.slice(idx, idx + query.length)}</mark>{text.slice(idx + query.length)}</>;
}

const readParam = (key: string) =>
  typeof window !== "undefined" ? new URLSearchParams(window.location.search).get(key) ?? "" : "";
const writeParams = (params: Record<string, string>) => {
  const url = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) url.set(k, v);
  }
  const qs = url.toString();
  history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
};

interface SoftwareItem {
  id: string;
  name: string;
  shortDescription: string;
  categories: string[];
  releaseDate: string;
  license: { id: string; name: string; url: string | null } | null;
  logo: string | null;
  logoFallback: string | null;
  developmentStatus: string;
  softwareType: string;
  intendedAudience: string[];
  catalogSlug: string | null;
  catalogName: string | null;
  catalogId: string;
  activity: SoftwareActivity | null;
  searchText: string;
  nameLower: string;
}

interface CatalogInfo {
  id: string;
  name: string;
  slug: string;
}

type SortBy = "name_asc" | "name_desc" | "release_date_desc" | "release_date_asc";

const sortItems = (items: SoftwareItem[], sortBy: SortBy): SoftwareItem[] => {
  const sorted = [...items];
  switch (sortBy) {
    case "name_asc":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "name_desc":
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "release_date_desc":
      sorted.sort((a, b) => {
        if (!a.releaseDate) return 1;
        if (!b.releaseDate) return -1;
        return b.releaseDate.localeCompare(a.releaseDate);
      });
      break;
    case "release_date_asc":
      sorted.sort((a, b) => {
        if (!a.releaseDate) return 1;
        if (!b.releaseDate) return -1;
        return a.releaseDate.localeCompare(b.releaseDate);
      });
      break;
  }
  return sorted;
};

interface Labels {
  allCategories: string;
  allStatuses: string;
  allAudiences: string;
  allCatalogs?: string;
  sortNameAsc: string;
  sortNameDesc: string;
  sortReleaseDesc: string;
  sortReleaseAsc: string;
  results: string;
  noResults: string;
  clearFilters: string;
  allTypes: string;
  searchPlaceholder: string;
  filters: string;
  sortBy: string;
  showMore: string;
  hasActivityData?: string;
  activityScore?: string;
  activityScoreNa?: string;
  activityScoreScope?: string;
  activityCapDisabled?: string;
  activityCapUnknown?: string;
  activityCustomWeights?: string;
}

const INITIAL_VISIBLE_ITEMS = 80;

export const SoftwareList: React.FC<{ items: SoftwareItem[]; base: string; labels?: Labels; locale?: string; catalogs?: CatalogInfo[]; statsByCatalog?: Record<string, CatalogStats>; globalStats?: CatalogStats | null }> = ({ items, base, labels, locale = 'en', catalogs, statsByCatalog = {}, globalStats }) => {
  const { configFor, hasOverride, ready: activityConfigReady, setWeightFor, setSplitFor, setIssueModeFor, setXmaxModeFor, resetFor } = useActivityConfigs();
  const { enabled: capWarningsEnabled, ready: capWarningsReady } = useCapWarningVisibility();
  const l = labels ?? { allCategories: "All categories", allStatuses: "All statuses", allAudiences: "All audiences", sortNameAsc: "Name A-Z", sortNameDesc: "Name Z-A", sortReleaseDesc: "Newest release", sortReleaseAsc: "Oldest release", results: "results", noResults: "No software found", clearFilters: "Clear filters", allTypes: "All types", searchPlaceholder: "Search software...", filters: "Filters", sortBy: "Sort by", showMore: "Show more" };
  const weightLabels = VITALITY_LABELS[locale === "it" ? "it" : "en"];
  const [inputValue, setInputValue] = useState(() => readParam("q"));
  const [query, setQuery] = useState(() => readParam("q"));
  const [sortBy, setSortBy] = useState<SortBy>(() => (readParam("sort_by") as SortBy) || "release_date_desc");
  const [category, setCategory] = useState(() => readParam("category"));
  const [status, setStatus] = useState(() => readParam("status"));
  const [softwareType, setSoftwareType] = useState(() => readParam("type"));
  const [audience, setAudience] = useState(() => readParam("audience"));
  const [catalog, setCatalog] = useState(() => readParam("catalog"));
  const [onlyActivity, setOnlyActivity] = useState(() => readParam("activity") === "1");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ITEMS);
  const [openScoreId, setOpenScoreId] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const id = setTimeout(() => setQuery(inputValue), 150);
    return () => clearTimeout(id);
  }, [inputValue]);

  useEffect(() => {
    writeParams({ q: query, category, status, type: softwareType, audience, catalog, activity: onlyActivity ? "1" : "", sort_by: sortBy === "release_date_desc" ? "" : sortBy });
  }, [query, category, status, softwareType, audience, catalog, onlyActivity, sortBy]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_ITEMS);
  }, [deferredQuery, category, status, softwareType, audience, catalog, onlyActivity, sortBy]);

  useEffect(() => {
    if (!openScoreId) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(".activity-score-panel, .activity-custom-toggle")) setOpenScoreId(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenScoreId(null);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openScoreId]);

  const allCategories = useMemo(() => [...new Set(items.flatMap((i) => i.categories))].sort(), [items]);
  const allStatuses = useMemo(() => [...new Set(items.map((i) => i.developmentStatus).filter(Boolean))].sort(), [items]);
  const allTypes = useMemo(() => [...new Set(items.map((i) => i.softwareType).filter(Boolean))].sort(), [items]);
  const allAudiences = useMemo(() => [...new Set(items.flatMap((i) => i.intendedAudience))].sort(), [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (deferredQuery) {
      const q = deferredQuery.toLowerCase();
      result = result.filter((i) => i.searchText.includes(q));
    }
    if (category) result = result.filter((i) => i.categories.includes(category));
    if (status) result = result.filter((i) => i.developmentStatus === status);
    if (softwareType) result = result.filter((i) => i.softwareType === softwareType);
    if (audience) result = result.filter((i) => i.intendedAudience.includes(audience));
    if (catalog) result = result.filter((i) => i.catalogSlug === catalog);
    if (onlyActivity) result = result.filter((i) => i.activity != null);
    return result;
  }, [items, deferredQuery, category, status, softwareType, audience, catalog, onlyActivity]);

  const anyActivity = useMemo(() => items.some((i) => i.activity != null), [items]);

  const sorted = useMemo(() => {
    if (deferredQuery) {
      const q = deferredQuery.toLowerCase();
      const rank = (i: SoftwareItem) => {
        const n = i.nameLower;
        if (n === q) return 0;
        if (n.startsWith(q)) return 1;
        return 2;
      };
      return [...filtered].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
    }
    return sortItems(filtered, sortBy);
  }, [filtered, sortBy, deferredQuery]);

  const visibleItems = useMemo(() => sorted.slice(0, visibleCount), [sorted, visibleCount]);

  return (
    <>
      <div className="catalog-search">
        <input
          type="search"
          value={inputValue}
          autoFocus
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={l.searchPlaceholder}
          aria-label={l.searchPlaceholder}
        />
      </div>

      <div className="catalog-filters" role="group" aria-label={l.filters}>
        {catalogs && (
          <select aria-label={l.allCatalogs ?? "All catalogs"} value={catalog} onChange={(e) => setCatalog(e.target.value)}>
            <option value="">{l.allCatalogs ?? "All catalogs"}</option>
            {catalogs.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
        )}
        <select aria-label={l.allCategories} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">{l.allCategories}</option>
          {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select aria-label={l.allStatuses} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{l.allStatuses}</option>
          {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label={l.allTypes} value={softwareType} onChange={(e) => setSoftwareType(e.target.value)}>
          <option value="">{l.allTypes}</option>
          {allTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select aria-label={l.allAudiences} value={audience} onChange={(e) => setAudience(e.target.value)}>
          <option value="">{l.allAudiences}</option>
          {allAudiences.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select aria-label={l.sortBy} value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
          <option value="release_date_desc">{l.sortReleaseDesc}</option>
          <option value="release_date_asc">{l.sortReleaseAsc}</option>
          <option value="name_asc">{l.sortNameAsc}</option>
          <option value="name_desc">{l.sortNameDesc}</option>
        </select>
        {anyActivity && (
          <label className="filter-check">
            <input type="checkbox" checked={onlyActivity} onChange={(e) => setOnlyActivity(e.target.checked)} />
            {l.hasActivityData ?? "With vitality data"}
          </label>
        )}
        <output>{sorted.length} {l.results}</output>
        {(query || category || status || softwareType || audience || catalog || onlyActivity) && (
          <button type="button" className="clear-filters" onClick={() => {
            setInputValue(""); setQuery(""); setCategory(""); setStatus(""); setSoftwareType(""); setAudience(""); setCatalog(""); setOnlyActivity(false);
          }}>{l.clearFilters}</button>
        )}
      </div>

      <section className="catalog-results">
        {sorted.length === 0 && <p className="no-results">{l.noResults}</p>}
        {visibleItems.map((item) => {
          const customConfig = activityConfigReady && hasOverride(item.id) ? configFor(item.id) : null;
          const detailHref = withActivityConfig(`${base}/software/${item.id}`, customConfig);
          return (
          <article key={item.id} className={openScoreId === item.id ? "is-score-open" : undefined}>
            {catalogs && item.catalogName && (
              <span className="catalog-badge">{item.catalogName}</span>
            )}
            <figure className={`software-thumb image-shell ${item.logo ? 'image-loading' : ''}`} suppressHydrationWarning>
              <span className="logo-placeholder" aria-hidden="true" suppressHydrationWarning>{item.name.charAt(0).toUpperCase()}</span>
              {item.logo && (
                <img className="image-fallback" src={item.logo} data-fallback={item.logoFallback ?? undefined} alt="" loading="lazy" suppressHydrationWarning />
              )}
            </figure>
            <header>
              <h2><a href={detailHref}>{highlight(item.name, query)}</a></h2>
              <p>{highlight(item.shortDescription, query)}</p>
            </header>
            <footer>
              <ul className="categories" aria-label="Categories">
                {item.categories.slice(0, 3).map((cat) => <li key={cat}>{cat}</li>)}
              </ul>
              {item.releaseDate && (() => {
                const d = formatDate(item.releaseDate, locale);
                return d ? <span className="card-date"><FontAwesomeIcon icon={faCalendar} /> <time dateTime={d.datetime} title={d.formatted}>{d.relative}</time></span> : null;
              })()}
              {item.license && (
                item.license.url
                  ? <a href={item.license.url} className="license"><FontAwesomeIcon icon={faGavel} /> {item.license.id}</a>
                  : <span className="license"><FontAwesomeIcon icon={faGavel} /> {item.license.id}</span>
              )}
            </footer>
            {item.activity && (() => {
              const activityConfig = configFor(item.id);
              const v = computeVitality(item.activity, globalStats ?? statsByCatalog[item.catalogId] ?? null, activityConfig);
              if (!activityConfigReady) {
                return (
                  <div className="activity-index is-loading" aria-busy="true" aria-label={l.activityScore ?? "Activity score"}>
                    <span className="activity-index-skeleton-label" aria-hidden="true" />
                    <span className="activity-index-skeleton-value" aria-hidden="true" />
                  </div>
                );
              }
              const custom = customConfig !== null;
              const hasUnknownCap = v.score100 !== null && v.cap?.reason === "unknown" && v.score100 === v.cap.limit;
              const showCapWarning = capWarningsReady && capWarningsEnabled && hasUnknownCap;
              const customNote = custom
                ? ` (${l.activityCustomWeights ?? "Custom weights for this software"})`
                : "";
              const expanded = custom && openScoreId === item.id;
              const scorePanelId = `activity-score-${item.id}`;
              const toggleScorePanel = () => {
                setOpenScoreId((open) => open === item.id ? null : item.id);
              };
              const resetScorePanel = () => {
                if (window.confirm(weightLabels.resetGlobalConfirmation)) {
                  resetFor(item.id);
                  setOpenScoreId(null);
                }
              };
              const customWeightTrigger = custom ? (
                <button type="button" className="activity-custom-toggle" onClick={toggleScorePanel} aria-expanded={expanded} aria-controls={scorePanelId} aria-label={l.activityCustomWeights ?? "Custom weights for this software"} title={l.activityCustomWeights ?? "Custom weights for this software"}>
                  <FontAwesomeIcon icon={faSliders} />
                </button>
              ) : (
                <span className="activity-custom-toggle-placeholder" aria-hidden="true" />
              );
              const scorePanel = expanded ? (
                <div className="activity-score-panel" id={scorePanelId}>
                  <svg className="activity-score-pointer" viewBox="0 0 14 8" aria-hidden="true" focusable="false">
                    <path d="M7 0.5 13.5 7.5h-13Z" />
                  </svg>
                  <div className="activity-score-panel-header">
                    <span>{weightLabels.weights}</span>
                    <div className="activity-score-panel-tools">
                      <button type="button" className="activity-score-reset" onClick={resetScorePanel} title={weightLabels.resetGlobal}>
                        <FontAwesomeIcon icon={faRotateLeft} />
                        <span>{weightLabels.resetGlobal}</span>
                      </button>
                      <button type="button" className="activity-score-close" onClick={toggleScorePanel} aria-label={weightLabels.popoverClose} title={weightLabels.popoverClose}>
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </div>
                  </div>
                  {v.score100 === null && <p>{weightLabels.scoreUnavailable}</p>}
                  <VitalityWeightsWidget
                    result={v}
                    config={activityConfig}
                    labels={weightLabels}
                    locale={locale}
                    onWeight={(key, value) => setWeightFor(item.id, key, value)}
                    onSplit={(edited, other, value) => setSplitFor(item.id, edited, other, value)}
                    onIssueMode={(mode) => setIssueModeFor(item.id, mode)}
                    onXmaxMode={(mode) => setXmaxModeFor(item.id, mode)}
                  />
                  <div className="activity-score-actions">
                    <button type="button" onClick={toggleScorePanel}>{weightLabels.popoverConfirm}</button>
                  </div>
                </div>
              ) : null;
              if (v.score100 === null) {
                return (
                  <div className="activity-index">
                    <div className="activity-index-label">
                      {l.activityScore ?? "Activity score"}
                      {customWeightTrigger}
                    </div>
                    <span className={`activity-badge is-na${activityConfigReady ? "" : " is-loading"}`} title={`${l.activityScoreNa ?? "Activity score unavailable"}${customNote}`}>n/a</span>
                    {scorePanel}
                  </div>
                );
              }
              const scope = v.covered < v.total
                ? ` (${(l.activityScoreScope ?? "based on {covered} of {total} metrics")
                    .replace("{covered}", String(v.covered))
                    .replace("{total}", String(v.total))})`
                : "";
              const capNote = v.cap && v.score100 === v.cap.limit
                ? ` (${v.cap.reason === "disabled"
                    ? (l.activityCapDisabled ?? "capped at 89: a forge feature is disabled")
                    : (l.activityCapUnknown ?? "capped at 79: some metrics are unknown")})`
                : "";
              return (
                  <div className={`activity-index${showCapWarning ? " is-capped-unknown" : ""}`}>
                    <div className="activity-index-label">
                      {showCapWarning && <span className="activity-cap-warning" title={l.activityCapUnknown ?? "Capped because some metrics are unknown"}><FontAwesomeIcon icon={faTriangleExclamation} /></span>}
                      {l.activityScore ?? "Activity score"}
                      {customWeightTrigger}
                    </div>
                  <span className={`activity-badge${custom ? " is-custom" : ""}${showCapWarning ? " is-capped-unknown" : ""}${activityConfigReady ? "" : " is-loading"}`} title={`${l.activityScore ?? "Activity score"}${scope}${capNote}${customNote}`}>
                    {Math.round(v.score100)}
                  </span>
                    {scorePanel}
                  </div>
              );
            })()}
          </article>
          );
        })}
      </section>
      {visibleCount < sorted.length && (
        <div className="catalog-more">
          <button type="button" onClick={() => setVisibleCount((count) => count + INITIAL_VISIBLE_ITEMS)}>
            {l.showMore}
          </button>
        </div>
      )}
    </>
  );
};
