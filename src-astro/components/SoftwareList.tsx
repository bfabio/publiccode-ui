import React, { useMemo, useState } from "react";

interface SoftwareItem {
  id: string;
  name: string;
  shortDescription: string;
  categories: string[];
  releaseDate: string;
  license: string;
  logo: string | null;
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
  const sorted = useMemo(() => sortItems(items, sortBy), [items, sortBy]);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <span style={{ color: "#666", fontSize: "0.9rem" }}>{sorted.length} results</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          style={{ padding: "0.3rem 0.5rem", fontSize: "0.9rem" }}
        >
          <option value="name">Name A-Z</option>
          <option value="release_date">Newest release</option>
        </select>
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
