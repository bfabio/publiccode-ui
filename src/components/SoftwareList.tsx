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
  const suggestionsRef = useRef<HTMLUListElement>(null);
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

  const allCategories = useMemo(
    () => [...new Set(items.flatMap((i) => i.categories))].sort(),
    [items],
  );
  const allStatuses = useMemo(
    () => [...new Set(items.map((i) => i.developmentStatus).filter(Boolean))].sort(),
    [items],
  );
  const allAudiences = useMemo(
    () => [...new Set(items.flatMap((i) => i.intendedAudience))].sort(),
    [items],
  );

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
      <search style={{ marginBottom: "1rem", position: "relative" }}>
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
          style={{
            width: "100%",
            padding: "0.6rem 1rem",
            fontSize: "1rem",
            border: "2px solid #e0e0e0",
            borderRadius: "8px",
            outline: "none",
            transition: "border-color 0.15s",
          }}
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul
            ref={suggestionsRef}
            id="search-suggestions"
            role="listbox"
            style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
              margin: "0.25rem 0 0", padding: 0, listStyle: "none",
              background: "#fff", border: "1px solid #e0e0e0", borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)", overflow: "hidden",
            }}
          >
            {suggestions.map((s, i) => (
              <li
                key={s.id}
                role="option"
                aria-selected={i === selectedIdx}
                onMouseDown={() => { window.location.href = `${base}/software/${s.id}`; }}
                onMouseEnter={() => setSelectedIdx(i)}
                style={{
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                  background: i === selectedIdx ? "#f0f4ff" : "transparent",
                  borderBottom: i < suggestions.length - 1 ? "1px solid #f0f0f0" : "none",
                }}
              >
                <div style={{ fontWeight: 600 }}>{highlight(s.name, inputValue)}</div>
                <div style={{ fontSize: "0.8rem", color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {highlight(s.shortDescription, inputValue)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </search>

      <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap" }}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ padding: "0.3rem 0.5rem", fontSize: "0.9rem" }}
        >
          <option value="">{l.allCategories}</option>
          {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ padding: "0.3rem 0.5rem", fontSize: "0.9rem" }}
        >
          <option value="">{l.allStatuses}</option>
          {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          style={{ padding: "0.3rem 0.5rem", fontSize: "0.9rem" }}
        >
          <option value="">{l.allAudiences}</option>
          {allAudiences.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          style={{ padding: "0.3rem 0.5rem", fontSize: "0.9rem" }}
        >
          <option value="name">{l.sortName}</option>
          <option value="release_date">{l.sortRelease}</option>
        </select>
        <span style={{ color: "#666", fontSize: "0.9rem", marginLeft: "auto" }}>{sorted.length} {l.results}</span>
      </div>

      {sorted.map((item) => (
        <div key={item.id} className="item">
          {item.logo
            ? <img className="logo" src={item.logo} alt="" loading="lazy" onError={(e) => {
                const el = e.currentTarget;
                const div = document.createElement('div');
                div.className = 'logo-box';
                div.textContent = '⬡';
                el.replaceWith(div);
              }} />
            : <div className="logo-box">⬡</div>
          }
          <div>
            <a className="name" href={`${base}/software/${item.id}`}>{highlight(item.name, query)}</a>
            <p className="desc">{highlight(item.shortDescription, query)}</p>
            <div className="tags">
              {item.categories.slice(0, 3).map((cat) => <span key={cat} className="tag">{cat}</span>)}
            </div>
          </div>
          <div className="meta">
            {item.releaseDate && (() => {
              const d = formatDate(item.releaseDate, locale);
              return d ? <time dateTime={d.datetime} title={d.formatted}>{d.relative}</time> : <div>{item.releaseDate}</div>;
            })()}
            {item.license && <div>{item.license.url ? <a href={item.license.url} target="_blank" rel="noopener" style={{ color: "#0066cc", textDecoration: "none" }}>{item.license.name}</a> : item.license.name}</div>}
          </div>
        </div>
      ))}
    </>
  );
};
