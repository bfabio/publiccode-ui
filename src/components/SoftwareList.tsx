import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDate } from "../lib/date.js";

function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return <>{text.slice(0, idx)}<mark>{text.slice(idx, idx + query.length)}</mark>{text.slice(idx + query.length)}</>;
}

function rankMatch(item: SoftwareItem, q: string): number {
  const name = item.name.toLowerCase();
  if (name === q) return 3;
  if (name.startsWith(q)) return 2;
  if (name.includes(q)) return 1;
  return 0;
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
  intendedAudience: string[];
}

type SortBy = "name" | "release_date";

const sortItems = (items: SoftwareItem[], sortBy: SortBy): SoftwareItem[] => {
  const sorted = [...items];
  switch (sortBy) {
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "release_date":
      sorted.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
      break;
  }
  return sorted;
};

interface Labels {
  allCategories: string;
  allStatuses: string;
  allAudiences: string;
  sortName: string;
  sortRelease: string;
  results: string;
}

export const SoftwareList: React.FC<{ items: SoftwareItem[]; base: string; labels?: Labels; locale?: string }> = ({ items, base, labels, locale = 'en' }) => {
  const l = labels ?? { allCategories: "All categories", allStatuses: "All statuses", allAudiences: "All audiences", sortName: "Name A-Z", sortRelease: "Newest release", results: "results" };
  const [inputValue, setInputValue] = useState(() => readParam("q"));
  const [query, setQuery] = useState(inputValue);
  const [sortBy, setSortBy] = useState<SortBy>(() => (readParam("sort_by") as SortBy) || "name");
  const [category, setCategory] = useState(() => readParam("category"));
  const [status, setStatus] = useState(() => readParam("status"));
  const [audience, setAudience] = useState(() => readParam("audience"));
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const MAX_SUGGESTIONS = 7;

  useEffect(() => {
    const id = setTimeout(() => setQuery(inputValue), 150);
    return () => clearTimeout(id);
  }, [inputValue]);

  const suggestions = useMemo(() => {
    if (!inputValue || inputValue.length < 2) return [];
    const q = inputValue.toLowerCase();
    return items
      .filter((i) => i.name.toLowerCase().includes(q) || i.shortDescription.toLowerCase().includes(q))
      .sort((a, b) => rankMatch(b, q) - rankMatch(a, q))
      .slice(0, MAX_SUGGESTIONS);
  }, [inputValue, items]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setInputValue(""); setQuery(""); setShowSuggestions(false); inputRef.current?.blur();
      return;
    }
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && selectedIdx >= 0) {
      e.preventDefault();
      window.location.href = `${base}/software/${suggestions[selectedIdx].id}`;
    }
  }, [showSuggestions, suggestions, selectedIdx, base]);

  useEffect(() => {
    writeParams({ q: query, category, status, audience, sort_by: sortBy === "name" ? "" : sortBy });
  }, [query, category, status, audience, sortBy]);

  const allCategories = useMemo(() => [...new Set(items.flatMap((i) => i.categories))].sort(), [items]);
  const allStatuses = useMemo(() => [...new Set(items.map((i) => i.developmentStatus).filter(Boolean))].sort(), [items]);
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
    if (audience) result = result.filter((i) => i.intendedAudience.includes(audience));
    return result;
  }, [items, query, category, status, audience]);

  const sorted = useMemo(() => sortItems(filtered, sortBy), [filtered, sortBy]);

  return (
    <>
      <search className="catalog-search">
        <input
          ref={inputRef}
          type="search"
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); setSelectedIdx(-1); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Search software..."
          autoFocus
          role="combobox"
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-autocomplete="list"
          aria-controls="search-suggestions"
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul id="search-suggestions" role="listbox" className="suggestions">
            {suggestions.map((s, i) => (
              <li
                key={s.id}
                role="option"
                aria-selected={i === selectedIdx}
                className={i === selectedIdx ? "selected" : ""}
                onMouseDown={() => { window.location.href = `${base}/software/${s.id}`; }}
                onMouseEnter={() => setSelectedIdx(i)}
              >
                <strong>{highlight(s.name, inputValue)}</strong>{" "}
                <span className="suggestion-desc">{s.shortDescription}</span>
              </li>
            ))}
          </ul>
        )}
      </search>

      <div className="catalog-filters" role="group" aria-label="Filters">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">{l.allCategories}</option>
          {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{l.allStatuses}</option>
          {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={audience} onChange={(e) => setAudience(e.target.value)}>
          <option value="">{l.allAudiences}</option>
          {allAudiences.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
          <option value="name">{l.sortName}</option>
          <option value="release_date">{l.sortRelease}</option>
        </select>
        <output>{sorted.length} {l.results}</output>
      </div>

      <section className="catalog-results">
        {sorted.map((item) => (
          <article key={item.id}>
            {item.logo && (
              <figure>
                <img src={item.logo} alt="" loading="lazy" onError={(e) => {
                  (e.currentTarget.parentElement as HTMLElement).remove();
                }} />
              </figure>
            )}
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
