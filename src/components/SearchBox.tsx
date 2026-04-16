import React, { useCallback, useMemo, useRef, useState } from "react";

interface SearchItem {
  id: string;
  name: string;
  shortDescription: string;
}

function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return <>{text.slice(0, idx)}<mark>{text.slice(idx, idx + query.length)}</mark>{text.slice(idx + query.length)}</>;
}

function rankMatch(item: SearchItem, q: string): number {
  const name = item.name.toLowerCase();
  if (name === q) return 3;
  if (name.startsWith(q)) return 2;
  if (name.includes(q)) return 1;
  return 0;
}

interface SearchBoxProps {
  items: SearchItem[];
  base: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}

const MAX_SUGGESTIONS = 7;

export const SearchBox: React.FC<SearchBoxProps> = ({ items, base, placeholder = "Search...", value, onChange }) => {
  const [internalValue, setInternalValue] = useState("");
  const inputValue = value ?? internalValue;
  const update = useCallback((v: string) => {
    if (onChange) onChange(v);
    else setInternalValue(v);
  }, [onChange]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [navigating, setNavigating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      update("");
      setShowSuggestions(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIdx >= 0 && suggestions.length > 0) {
        setNavigating(true);
        window.location.href = `${base}/software/${suggestions[selectedIdx].id}`;
      } else if (inputValue.trim()) {
        setNavigating(true);
        window.location.href = `${base}/software/?q=${encodeURIComponent(inputValue.trim())}`;
      }
      return;
    }
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    }
  }, [showSuggestions, suggestions, selectedIdx, base, inputValue, update]);

  return (
    <search className="catalog-search">
      <input
        ref={inputRef}
        type="search"
        value={inputValue}
        disabled={navigating}
        onChange={(e) => { update(e.target.value); setShowSuggestions(true); setSelectedIdx(-1); }}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={showSuggestions && suggestions.length > 0}
        aria-autocomplete="list"
        aria-controls="search-suggestions"
        style={navigating ? { opacity: 0.6, cursor: "wait" } : undefined}
      />
      {navigating && (
        <>
          <style>{"@keyframes search-spin { to { transform: rotate(360deg) } }"}</style>
          <span
            aria-label="Loading"
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              marginTop: -8,
              width: 16,
              height: 16,
              border: "2px solid currentColor",
              borderRightColor: "transparent",
              borderRadius: "50%",
              animation: "search-spin 0.6s linear infinite",
            }}
          />
        </>
      )}
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
  );
};
