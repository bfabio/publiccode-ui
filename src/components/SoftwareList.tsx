import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGavel } from "@fortawesome/free-solid-svg-icons";
import { faCalendar } from "@fortawesome/free-regular-svg-icons";
import { formatDate } from "../lib/date.js";

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
  developmentStatus: string;
  softwareType: string;
  intendedAudience: string[];
  catalogSlug: string | null;
  catalogName: string | null;
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
}

export const SoftwareList: React.FC<{ items: SoftwareItem[]; base: string; labels?: Labels; locale?: string; catalogs?: CatalogInfo[] }> = ({ items, base, labels, locale = 'en', catalogs }) => {
  const l = labels ?? { allCategories: "All categories", allStatuses: "All statuses", allAudiences: "All audiences", sortNameAsc: "Name A-Z", sortNameDesc: "Name Z-A", sortReleaseDesc: "Newest release", sortReleaseAsc: "Oldest release", results: "results", noResults: "No software found", clearFilters: "Clear filters", allTypes: "All types", searchPlaceholder: "Search software...", filters: "Filters", sortBy: "Sort by" };
  const [inputValue, setInputValue] = useState(() => readParam("q"));
  const [query, setQuery] = useState(inputValue);
  const [sortBy, setSortBy] = useState<SortBy>(() => (readParam("sort_by") as SortBy) || "release_date_desc");
  const [category, setCategory] = useState(() => readParam("category"));
  const [status, setStatus] = useState(() => readParam("status"));
  const [softwareType, setSoftwareType] = useState(() => readParam("type"));
  const [audience, setAudience] = useState(() => readParam("audience"));
  const [catalog, setCatalog] = useState(() => readParam("catalog"));

  useEffect(() => {
    const id = setTimeout(() => setQuery(inputValue), 150);
    return () => clearTimeout(id);
  }, [inputValue]);

  useEffect(() => {
    writeParams({ q: query, category, status, type: softwareType, audience, catalog, sort_by: sortBy === "release_date_desc" ? "" : sortBy });
  }, [query, category, status, softwareType, audience, catalog, sortBy]);

  const allCategories = useMemo(() => [...new Set(items.flatMap((i) => i.categories))].sort(), [items]);
  const allStatuses = useMemo(() => [...new Set(items.map((i) => i.developmentStatus).filter(Boolean))].sort(), [items]);
  const allTypes = useMemo(() => [...new Set(items.map((i) => i.softwareType).filter(Boolean))].sort(), [items]);
  const allAudiences = useMemo(() => [...new Set(items.flatMap((i) => i.intendedAudience))].sort(), [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (query) {
      const q = query.toLowerCase();
      result = result.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        i.shortDescription.toLowerCase().includes(q) ||
        i.categories.some((c) => c.toLowerCase().includes(q))
      );
    }
    if (category) result = result.filter((i) => i.categories.includes(category));
    if (status) result = result.filter((i) => i.developmentStatus === status);
    if (softwareType) result = result.filter((i) => i.softwareType === softwareType);
    if (audience) result = result.filter((i) => i.intendedAudience.includes(audience));
    if (catalog) result = result.filter((i) => i.catalogSlug === catalog);
    return result;
  }, [items, query, category, status, softwareType, audience, catalog]);

  const sorted = useMemo(() => {
    if (query) {
      const q = query.toLowerCase();
      const rank = (i: SoftwareItem) => {
        const n = i.name.toLowerCase();
        if (n === q) return 0;
        if (n.startsWith(q)) return 1;
        return 2;
      };
      return [...filtered].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
    }
    return sortItems(filtered, sortBy);
  }, [filtered, sortBy, query]);

  return (
    <>
      <div className="catalog-search">
        <input
          type="search"
          value={inputValue}
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
        <output>{sorted.length} {l.results}</output>
        {(query || category || status || softwareType || audience || catalog) && (
          <button type="button" className="clear-filters" onClick={() => {
            setInputValue(""); setQuery(""); setCategory(""); setStatus(""); setSoftwareType(""); setAudience(""); setCatalog("");
          }}>{l.clearFilters}</button>
        )}
      </div>

      <section className="catalog-results">
        {sorted.length === 0 && <p className="no-results">{l.noResults}</p>}
        {sorted.map((item) => (
          <article key={item.id}>
            <figure className="software-thumb">
              <span className="logo-placeholder" aria-hidden="true">{item.name.charAt(0).toUpperCase()}</span>
              {item.logo && (
                <img src={item.logo} alt="" loading="lazy"
                  onLoad={(e) => {
                    e.currentTarget.style.visibility = 'visible';
                    const el = e.currentTarget.previousElementSibling as HTMLElement | null;
                    if (el) el.style.visibility = 'hidden';
                  }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
            </figure>
            <header>
              <h2><a href={`${base}/software/${item.id}`}>{highlight(item.name, query)}</a></h2>
              <p>{highlight(item.shortDescription, query)}</p>
            </header>
            <footer>
              {catalogs && item.catalogName && (
                <span className="catalog-badge">{item.catalogName}</span>
              )}
              <ul className="categories" aria-label="Categories">
                {item.categories.slice(0, 3).map((cat) => <li key={cat}>{cat}</li>)}
              </ul>{" "}
              {item.releaseDate && (() => {
                const d = formatDate(item.releaseDate, locale);
                return d ? <><FontAwesomeIcon icon={faCalendar} /> <time dateTime={d.datetime} title={d.formatted}>{d.relative}</time>{" "}</> : null;
              })()}
              {item.license && (
                item.license.url
                  ? <a href={item.license.url} className="license"><FontAwesomeIcon icon={faGavel} /> {item.license.id}</a>
                  : <span className="license"><FontAwesomeIcon icon={faGavel} /> {item.license.id}</span>
              )}
            </footer>
          </article>
        ))}
      </section>
    </>
  );
};
