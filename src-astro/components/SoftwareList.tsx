import React, { useMemo, useState } from "react";

interface SoftwareItem {
  id: string;
  name: string;
  shortDescription: string;
  categories: string[];
  releaseDate: string;
  license: string;
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

export const SoftwareList: React.FC<{ items: SoftwareItem[]; base: string }> = ({ items, base }) => {
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [audience, setAudience] = useState("");

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
    if (category) result = result.filter((i) => i.categories.includes(category));
    if (status) result = result.filter((i) => i.developmentStatus === status);
    if (audience) result = result.filter((i) => i.intendedAudience.includes(audience));
    return result;
  }, [items, category, status, audience]);

  const sorted = useMemo(() => sortItems(filtered, sortBy), [filtered, sortBy]);

  return (
    <>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap" }}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ padding: "0.3rem 0.5rem", fontSize: "0.9rem" }}
        >
          <option value="">All categories</option>
          {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ padding: "0.3rem 0.5rem", fontSize: "0.9rem" }}
        >
          <option value="">All statuses</option>
          {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          style={{ padding: "0.3rem 0.5rem", fontSize: "0.9rem" }}
        >
          <option value="">All audiences</option>
          {allAudiences.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          style={{ padding: "0.3rem 0.5rem", fontSize: "0.9rem" }}
        >
          <option value="name">Name A-Z</option>
          <option value="release_date">Newest release</option>
        </select>
        <span style={{ color: "#666", fontSize: "0.9rem", marginLeft: "auto" }}>{sorted.length} results</span>
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
            <a className="name" href={`${base}/software/${item.id}`}>{item.name}</a>
            <p className="desc">{item.shortDescription}</p>
            <div className="tags">
              {item.categories.slice(0, 3).map((cat) => <span key={cat} className="tag">{cat}</span>)}
            </div>
          </div>
          <div className="meta">
            {item.releaseDate && <div>{item.releaseDate}</div>}
            {item.license && <div>{item.license}</div>}
          </div>
        </div>
      ))}
    </>
  );
};
