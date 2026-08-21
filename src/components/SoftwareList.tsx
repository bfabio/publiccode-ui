import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleInfo, faDownload, faFilter, faGavel, faList, faRotateLeft, faSliders, faSort, faSortDown, faSortUp, faTable, faXmark } from "@fortawesome/free-solid-svg-icons";
import { faCalendar } from "@fortawesome/free-regular-svg-icons";
import { formatDate } from "../lib/date.js";
import { computeVitality, DIMENSION_ORDER, type DimensionKey } from "../lib/vitality";
import { sortByScores, sortItems, type SortBy, type SortDirection } from "../lib/sortSoftware";
import { toCsv } from "../lib/csv";
import { useActivityConfigs, useCapWarningVisibility, useListWeightDistributionVisibility } from "../lib/useVitalityConfig";
import { withActivityConfig } from "../lib/vitalityStore";
import type { SoftwareActivity, CatalogStats } from "../types/analysis";
import { LABELS as VITALITY_LABELS } from "../lib/vitalityLabels";
import { VitalityWeightDistribution, VitalityWeightsWidget } from "./VitalityWeightsWidget";
import { catalogFlag } from "../lib/catalogFlags";

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

interface Labels {
  allCategories: string;
  allStatuses: string;
  allAudiences: string;
  allCatalogs?: string;
  sortNameAsc: string;
  sortNameDesc: string;
  sortReleaseDesc: string;
  sortReleaseAsc: string;
  sortActivityDesc?: string;
  sortActivityAsc?: string;
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
  activityDataCompleteness?: string;
  viewList?: string;
  viewTable?: string;
  colName?: string;
  exportCsv?: string;
}

const INITIAL_VISIBLE_ITEMS = 80;

type ListSortBy = SortBy | `dim_${DimensionKey}_${SortDirection}`;
type TableColumn = "name" | "total" | DimensionKey;

const tableSortsFor = (col: TableColumn): [ListSortBy, ListSortBy] => {
  if (col === "name") return ["name_asc", "name_desc"];
  if (col === "total") return ["activity_desc", "activity_asc"];
  return [`dim_${col}_desc`, `dim_${col}_asc`];
};

export const SoftwareList: React.FC<{ items: SoftwareItem[]; base: string; labels?: Labels; locale?: string; catalogs?: CatalogInfo[]; statsByCatalog?: Record<string, CatalogStats>; globalStats?: CatalogStats | null; title?: string }> = ({ items, base, labels, locale = 'en', catalogs, statsByCatalog = {}, globalStats, title }) => {
  const { configFor, hasOverride, ready: activityConfigReady, setWeightFor, setSplitFor, setIssueModeFor, setXmaxModeFor, resetFor } = useActivityConfigs();
  const { enabled: capWarningsEnabled, ready: capWarningsReady } = useCapWarningVisibility();
  const { enabled: listWeightDistributionEnabled, ready: listWeightDistributionReady } = useListWeightDistributionVisibility();
  const l = labels ?? { allCategories: "All categories", allStatuses: "All statuses", allAudiences: "All audiences", sortNameAsc: "Name A-Z", sortNameDesc: "Name Z-A", sortReleaseDesc: "Newest release", sortReleaseAsc: "Oldest release", results: "results", noResults: "No software found", clearFilters: "Clear filters", allTypes: "All types", searchPlaceholder: "Search software...", filters: "Filters", sortBy: "Sort by", showMore: "Show more" };
  const weightLabels = VITALITY_LABELS[locale === "it" ? "it" : "en"];
  const [inputValue, setInputValue] = useState(() => readParam("q"));
  const [query, setQuery] = useState(() => readParam("q"));
  const [sortBy, setSortBy] = useState<ListSortBy>(() =>
    (readParam("sort_by") as ListSortBy) || (readParam("view") === "table" ? "activity_desc" : "release_date_desc"));
  const [category, setCategory] = useState(() => readParam("category"));
  const [status, setStatus] = useState(() => readParam("status"));
  const [softwareType, setSoftwareType] = useState(() => readParam("type"));
  const [audience, setAudience] = useState(() => readParam("audience"));
  const [catalog, setCatalog] = useState(() => readParam("catalog"));
  const [onlyActivity, setOnlyActivity] = useState(() => readParam("activity") === "1");
  const [view, setView] = useState<"list" | "table">(() => readParam("view") === "table" ? "table" : "list");
  const [filtersOpen, setFiltersOpen] = useState(() =>
    Boolean(readParam("category") || readParam("status") || readParam("type") || readParam("audience") || readParam("catalog") || readParam("activity") === "1"));
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ITEMS);
  const [openScoreId, setOpenScoreId] = useState<string | null>(null);
  const [dataInfoOpen, setDataInfoOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const id = setTimeout(() => setQuery(inputValue), 150);
    return () => clearTimeout(id);
  }, [inputValue]);

  useEffect(() => {
    writeParams({ q: query, category, status, type: softwareType, audience, catalog, activity: onlyActivity ? "1" : "", sort_by: sortBy === "release_date_desc" ? "" : sortBy, view: view === "table" ? "table" : "" });
  }, [query, category, status, softwareType, audience, catalog, onlyActivity, sortBy, view]);

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

  useEffect(() => {
    document.documentElement.dataset.catalogView = view;
    document.documentElement.dataset.catalogHydrated = "1";
  }, [view]);

  useEffect(() => {
    if (!dataInfoOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(".catalog-data-completeness-panel, .catalog-data-completeness-toggle")) setDataInfoOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDataInfoOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [dataInfoOpen]);

  const allCategories = useMemo(() => [...new Set(items.flatMap((i) => i.categories))].sort(), [items]);
  const allStatuses = useMemo(() => [...new Set(items.map((i) => i.developmentStatus).filter(Boolean))].sort(), [items]);
  const allTypes = useMemo(() => [...new Set(items.map((i) => i.softwareType).filter(Boolean))].sort(), [items]);
  const allAudiences = useMemo(() => [...new Set(items.flatMap((i) => i.intendedAudience))].sort(), [items]);
  const incompleteDataCount = useMemo(() => items.filter((item) => {
    if (!item.activity) return true;
    const result = computeVitality(item.activity, globalStats ?? statsByCatalog[item.catalogId] ?? null, configFor(item.id));
    return result.score100 === null || result.cap?.reason === "unknown";
  }).length, [items, globalStats, statsByCatalog, configFor]);
  const incompleteDataPercentage = items.length === 0 ? 0 : Math.round((incompleteDataCount / items.length) * 100);
  const incompleteDataSummary = (l.activityDataCompleteness ?? "{total} total - {missing} have missing data = {percentage}%")
    .replace("{total}", items.length.toLocaleString(locale))
    .replace("{missing}", incompleteDataCount.toLocaleString(locale))
    .replace("{percentage}", String(incompleteDataPercentage));

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

  const activityScores = useMemo(() => {
    if (sortBy !== "activity_desc" && sortBy !== "activity_asc") return undefined;
    const scores = new Map<string, number | null>();
    for (const i of items) {
      if (i.activity) {
        scores.set(i.id, computeVitality(i.activity, globalStats ?? statsByCatalog[i.catalogId] ?? null, configFor(i.id)).score100);
      }
    }
    return scores;
  }, [sortBy, items, statsByCatalog, globalStats, configFor]);

  const dimensionScores = useMemo(() => {
    if (!sortBy.startsWith("dim_")) return undefined;
    const key = sortBy.slice(4, sortBy.lastIndexOf("_")) as DimensionKey;
    const scores = new Map<string, number | null>();
    for (const i of items) {
      if (i.activity) {
        const dim = computeVitality(i.activity, globalStats ?? statsByCatalog[i.catalogId] ?? null, configFor(i.id))
          .dimensions.find((d) => d.key === key);
        scores.set(i.id, dim && dim.present && dim.normalized !== null ? dim.contribution : null);
      }
    }
    return scores;
  }, [sortBy, items, statsByCatalog, globalStats, configFor]);

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
    if (sortBy.startsWith("dim_")) {
      return dimensionScores ? sortByScores(filtered, dimensionScores, sortBy.endsWith("_asc") ? "asc" : "desc") : filtered;
    }
    return sortItems(filtered, sortBy as SortBy, activityScores);
  }, [filtered, sortBy, deferredQuery, activityScores, dimensionScores]);

  const visibleItems = useMemo(() => sorted.slice(0, visibleCount), [sorted, visibleCount]);

  const tableSortDirection = (col: TableColumn): "ascending" | "descending" | undefined => {
    const [primary, secondary] = tableSortsFor(col);
    if (sortBy !== primary && sortBy !== secondary) return undefined;
    return sortBy.endsWith("_asc") ? "ascending" : "descending";
  };
  const toggleTableSort = (col: TableColumn) => {
    const [primary, secondary] = tableSortsFor(col);
    setSortBy((current) => current === primary ? secondary : primary);
  };
  const switchView = (next: "list" | "table") => {
    if (next === "list" && sortBy.startsWith("dim_")) {
      setSortBy("release_date_desc");
    }
    if (next === "table" && sortBy.startsWith("release_date")) {
      setSortBy("activity_desc");
    }
    setView(next);
  };
  const activeFilterCount =
    [category, status, softwareType, audience, catalog].filter(Boolean).length + (onlyActivity ? 1 : 0);
  const exportTableCsv = () => {
    const header = [l.colName ?? "Name", l.activityScore ?? "Activity score", ...DIMENSION_ORDER.map((key) => weightLabels.dim[key])];
    const rows = sorted.map((item) => {
      const v = item.activity
        ? computeVitality(item.activity, globalStats ?? statsByCatalog[item.catalogId] ?? null, configFor(item.id))
        : null;
      return [
        item.name,
        v && v.score100 !== null ? Math.round(v.score100) : null,
        ...DIMENSION_ORDER.map((key) => {
          const dim = v?.dimensions.find((d) => d.key === key);
          return dim && dim.present && dim.normalized !== null ? Math.round(dim.contribution) : null;
        }),
      ];
    });
    const blob = new Blob([toCsv([header, ...rows])], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "software-catalog.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const sortableHeader = (col: TableColumn, label: string) => {
    const direction = tableSortDirection(col);
    return (
      <th aria-sort={direction} className={col === "name" ? undefined : "catalog-table-score"}>
        <button type="button" onClick={() => toggleTableSort(col)}>
          {label}
          <FontAwesomeIcon icon={direction === "ascending" ? faSortUp : direction === "descending" ? faSortDown : faSort} aria-hidden="true" />
        </button>
      </th>
    );
  };

  const viewToggle = (
    <div className="view-toggle" role="group" aria-label={`${l.viewList ?? "List view"} / ${l.viewTable ?? "Table view"}`}>
      <button type="button" className={view === "list" ? "is-active" : undefined} onClick={() => switchView("list")} aria-pressed={view === "list"} aria-label={l.viewList ?? "List view"} title={l.viewList ?? "List view"}>
        <FontAwesomeIcon icon={faList} />
      </button>
      <button type="button" className={view === "table" ? "is-active" : undefined} onClick={() => switchView("table")} aria-pressed={view === "table"} aria-label={l.viewTable ?? "Table view"} title={l.viewTable ?? "Table view"}>
        <FontAwesomeIcon icon={faTable} />
      </button>
    </div>
  );

  return (
    <>
      <div className="catalog-header">
        {title && <h1>{title}</h1>}
        {viewToggle}
      </div>
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

      <div className="catalog-toolbar">
        {view === "list" && (
          <label className="sort-control">
            <span>{l.sortBy}</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
              <option value="release_date_desc">{l.sortReleaseDesc}</option>
              <option value="release_date_asc">{l.sortReleaseAsc}</option>
              <option value="name_asc">{l.sortNameAsc}</option>
              <option value="name_desc">{l.sortNameDesc}</option>
              {anyActivity && <option value="activity_desc">{l.sortActivityDesc ?? "Highest activity score"}</option>}
              {anyActivity && <option value="activity_asc">{l.sortActivityAsc ?? "Lowest activity score"}</option>}
            </select>
          </label>
        )}
        <button
          type="button"
          className="filters-toggle"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          aria-controls="catalog-filters"
        >
          <FontAwesomeIcon icon={faFilter} aria-hidden="true" /> {l.filters}
          {activeFilterCount > 0 && <span className="filters-active-count">{activeFilterCount}</span>}
        </button>
        <output className="catalog-result-count" aria-label={`${sorted.length} ${l.results}`}>
          {sorted.length} {l.results}
          <button
            type="button"
            className="catalog-data-completeness-toggle"
            onClick={() => setDataInfoOpen((open) => !open)}
            aria-expanded={dataInfoOpen}
            aria-controls="catalog-data-completeness-panel"
            aria-label={incompleteDataSummary}
          >
            <FontAwesomeIcon className="catalog-data-completeness" icon={faCircleInfo} aria-hidden="true" />
          </button>
          {dataInfoOpen && (
            <span className="catalog-data-completeness-panel" id="catalog-data-completeness-panel">
              {incompleteDataSummary}
            </span>
          )}
        </output>
      </div>

      {filtersOpen && (
      <div className="catalog-filters" id="catalog-filters" role="group" aria-label={l.filters}>
        {catalogs && (
          <select aria-label={l.allCatalogs ?? "All catalogs"} value={catalog} onChange={(e) => setCatalog(e.target.value)}>
            <option value="">{l.allCatalogs ?? "All catalogs"}</option>
            {catalogs.map((c) => <option key={c.id} value={c.slug}>{[catalogFlag(c.slug), c.name].filter(Boolean).join(" ")}</option>)}
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
        {anyActivity && (
          <label className="filter-check">
            <input type="checkbox" checked={onlyActivity} onChange={(e) => setOnlyActivity(e.target.checked)} />
            {l.hasActivityData ?? "With vitality data"}
          </label>
        )}
        {(query || category || status || softwareType || audience || catalog || onlyActivity) && (
          <button type="button" className="clear-filters" onClick={() => {
            setInputValue(""); setQuery(""); setCategory(""); setStatus(""); setSoftwareType(""); setAudience(""); setCatalog(""); setOnlyActivity(false);
          }}>{l.clearFilters}</button>
        )}
      </div>
      )}

      {view === "table" ? (
        <div className="catalog-table-wrap">
          {sorted.length === 0 ? <p className="no-results">{l.noResults}</p> : (
            <>
            <div className="catalog-table-toolbar">
              <button type="button" className="catalog-table-export" onClick={exportTableCsv}>
                <FontAwesomeIcon icon={faDownload} aria-hidden="true" /> {l.exportCsv ?? "Export CSV"}
              </button>
            </div>
            <table className="catalog-table">
              <thead>
                <tr>
                  {sortableHeader("name", l.colName ?? "Name")}
                  {sortableHeader("total", l.activityScore ?? "Activity score")}
                  {DIMENSION_ORDER.map((key) => (
                    <React.Fragment key={key}>
                      {sortableHeader(key, weightLabels.dim[key])}
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => {
                  const customConfig = activityConfigReady && hasOverride(item.id) ? configFor(item.id) : null;
                  const detailHref = withActivityConfig(`${base}/software/${item.id}`, customConfig);
          const flag = catalogFlag(item.catalogSlug);
                  const v = item.activity
                    ? computeVitality(item.activity, globalStats ?? statsByCatalog[item.catalogId] ?? null, configFor(item.id))
                    : null;
                  return (
                    <tr
                      key={item.id}
                      onClick={(e) => {
                        if ((e.target as Element).closest("a")) return;
                        window.location.assign(detailHref);
                      }}
                    >
                      <td><a href={detailHref}>{highlight(item.name, query)}</a></td>
                      <td className="catalog-table-score">
                        {v && (
                          v.overAllocated
                            ? <span className="activity-badge is-over-allocated" title={weightLabels.overAllocatedTitle}>?</span>
                            : v.score100 === null
                              ? <span className="activity-badge is-na">n/a</span>
                              : <span className="activity-badge">{Math.round(v.score100)}</span>
                        )}
                      </td>
                      {DIMENSION_ORDER.map((key) => {
                        const dim = v?.dimensions.find((d) => d.key === key);
                        const points = dim && dim.present && dim.normalized !== null ? Math.round(dim.contribution) : null;
                        const state = dim?.state ?? "unknown";
                        const token = state === "failed" ? weightLabels.stateFailed
                          : state === "disabled" ? weightLabels.stateDisabled
                          : weightLabels.stateUnknown;
                        const stateTitle = state === "failed" ? weightLabels.stateFailedTitle
                          : state === "disabled" ? weightLabels.stateDisabledTitle
                          : weightLabels.stateUnknownTitle;
                        return (
                          <td key={key} className={`catalog-table-score${points === null ? " is-na" : ""}`} title={points === null ? stateTitle : undefined}>
                            {points !== null ? points : (v ? token : "-")}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </>
          )}
        </div>
      ) : (
      <section className="catalog-results">
        {sorted.length === 0 && <p className="no-results">{l.noResults}</p>}
        {visibleItems.map((item) => {
          const itemActivityConfig = configFor(item.id);
          const customConfig = activityConfigReady && hasOverride(item.id) ? configFor(item.id) : null;
          const detailHref = withActivityConfig(`${base}/software/${item.id}`, customConfig);
          const flag = catalogFlag(item.catalogSlug);
          return (
          <article key={item.id} className={openScoreId === item.id ? "is-score-open" : undefined}>
            {catalogs && item.catalogName && (
              <span className="catalog-badge">{flag && <span className="catalog-flag" aria-hidden="true">{flag}</span>}{item.catalogName}</span>
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
                {item.categories.slice(0, 3).map((cat) => (
                  <li key={cat}>
                    <button type="button" onClick={() => setCategory(cat)}>{cat}</button>
                  </li>
                ))}
              </ul>
              {item.releaseDate && (() => {
                const d = formatDate(item.releaseDate, locale);
                return d ? <span className="card-date"><FontAwesomeIcon icon={faCalendar} /> <time dateTime={d.datetime} title={d.formatted}>{d.relative}</time></span> : null;
              })()}
              {item.license && (
                item.license.url
                  ? <a href={item.license.url} className="license" target="_blank" rel="noopener noreferrer"><FontAwesomeIcon icon={faGavel} /> {item.license.id}</a>
                  : <span className="license"><FontAwesomeIcon icon={faGavel} /> {item.license.id}</span>
              )}
            </footer>
            {item.activity && (() => {
              const activityConfig = itemActivityConfig;
              const v = computeVitality(item.activity, globalStats ?? statsByCatalog[item.catalogId] ?? null, activityConfig);
              if (!activityConfigReady) {
                return (
                  <div className="activity-index is-loading" aria-busy="true" aria-label={l.activityScore ?? "Activity score"}>
                    <span className="activity-index-skeleton-label" aria-hidden="true" />
                    <span className="activity-index-skeleton-value" aria-hidden="true" />
                    <div className="software-weight-distribution activity-index-skeleton-distribution" aria-hidden="true">
                      <div className="vitality-weight-distribution">
                        <div className="vitality-weight-bar" />
                        <div className="vitality-weight-legend">
                          {DIMENSION_ORDER.map((key) => (
                            <span key={key} className="vitality-weight-legend-item">
                              <span className="vitality-weight-legend-swatch" />
                              <span className="vitality-weight-legend-label">&nbsp;</span>
                              <span className="vitality-weight-legend-value">&nbsp;</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
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
                  {v.score100 === null && !v.overAllocated && <p>{weightLabels.scoreUnavailable}</p>}
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
              const weightDistribution = listWeightDistributionReady && listWeightDistributionEnabled ? (
                <div className="software-weight-distribution">
                  <VitalityWeightDistribution config={activityConfig} labels={weightLabels} result={v} />
                </div>
              ) : null;
              if (v.score100 === null) {
                return (
                  <div className="activity-index">
                    <div className="activity-index-label">
                      <span className="activity-index-label-text">{l.activityScore ?? "Activity score"}</span>
                      {customWeightTrigger}
                    </div>
                    <span className={`activity-badge ${v.overAllocated ? "is-over-allocated" : "is-na"}${activityConfigReady ? "" : " is-loading"}`} title={`${v.overAllocated ? weightLabels.overAllocatedTitle : l.activityScoreNa ?? "Activity score unavailable"}${customNote}`}>
                      {v.overAllocated ? "?" : "n/a"}
                    </span>
                    {weightDistribution}
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
                      <span className="activity-index-label-text">{l.activityScore ?? "Activity score"}</span>
                      {customWeightTrigger}
                    </div>
                  <span className={`activity-badge${custom ? " is-custom" : ""}${showCapWarning ? " is-capped-unknown" : ""}${activityConfigReady ? "" : " is-loading"}`} title={`${l.activityScore ?? "Activity score"}${scope}${capNote}${customNote}`}>
                    {Math.round(v.score100)}
                  </span>
                    {weightDistribution}
                    {scorePanel}
                  </div>
              );
            })()}
          </article>
          );
        })}
      </section>
      )}
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
