import React, { useEffect, useMemo, useState } from "react";
import { formatDate } from "../lib/date.js";
import { SearchBox } from "./SearchBox";

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
}

export const SoftwareList: React.FC<{ items: SoftwareItem[]; base: string; labels?: Labels; locale?: string }> = ({ items, base, labels, locale = 'en' }) => {
  const l = labels ?? { allCategories: "All categories", allStatuses: "All statuses", allAudiences: "All audiences", sortNameAsc: "Name A-Z", sortNameDesc: "Name Z-A", sortReleaseDesc: "Newest release", sortReleaseAsc: "Oldest release", results: "results", noResults: "No software found", clearFilters: "Clear filters", allTypes: "All types", searchPlaceholder: "Search software...", filters: "Filters" };
  const [inputValue, setInputValue] = useState(() => readParam("q"));
  const [query, setQuery] = useState(inputValue);
  const [sortBy, setSortBy] = useState<SortBy>(() => (readParam("sort_by") as SortBy) || "name_asc");
  const [category, setCategory] = useState(() => readParam("category"));
  const [status, setStatus] = useState(() => readParam("status"));
  const [softwareType, setSoftwareType] = useState(() => readParam("type"));
  const [audience, setAudience] = useState(() => readParam("audience"));

  useEffect(() => {
    const id = setTimeout(() => setQuery(inputValue), 150);
    return () => clearTimeout(id);
  }, [inputValue]);

  useEffect(() => {
    writeParams({ q: query, category, status, type: softwareType, audience, sort_by: sortBy === "name_asc" ? "" : sortBy });
  }, [query, category, status, softwareType, audience, sortBy]);

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
    return result;
  }, [items, query, category, status, softwareType, audience]);

  const sorted = useMemo(() => sortItems(filtered, sortBy), [filtered, sortBy]);

  return (
    <>
      <SearchBox items={items} base={base} value={inputValue} onChange={setInputValue} placeholder={l.searchPlaceholder} />

      <div className="catalog-filters" role="group" aria-label={l.filters}>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">{l.allCategories}</option>
          {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{l.allStatuses}</option>
          {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={softwareType} onChange={(e) => setSoftwareType(e.target.value)}>
          <option value="">{l.allTypes}</option>
          {allTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={audience} onChange={(e) => setAudience(e.target.value)}>
          <option value="">{l.allAudiences}</option>
          {allAudiences.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
          <option value="name_asc">{l.sortNameAsc}</option>
          <option value="name_desc">{l.sortNameDesc}</option>
          <option value="release_date_desc">{l.sortReleaseDesc}</option>
          <option value="release_date_asc">{l.sortReleaseAsc}</option>
        </select>
        <output>{sorted.length} {l.results}</output>
        {(query || category || status || softwareType || audience) && (
          <button type="button" className="clear-filters" onClick={() => {
            setInputValue(""); setQuery(""); setCategory(""); setStatus(""); setSoftwareType(""); setAudience("");
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
              <ul className="categories" aria-label="Categories">
                {item.categories.slice(0, 3).map((cat) => <li key={cat}>{cat}</li>)}
              </ul>{" "}
              {item.releaseDate && (() => {
                const d = formatDate(item.releaseDate, locale);
                return d ? <><time dateTime={d.datetime} title={d.formatted}>{d.relative}</time>{" "}</> : null;
              })()}
              {item.license && (
                item.license.url
                  ? <a href={item.license.url} className="license">{item.license.id}</a>
                  : <span className="license">{item.license.id}</span>
              )}
            </footer>
          </article>
        ))}
      </section>
    </>
  );
};
