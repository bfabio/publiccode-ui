import React from "react";

interface SoftwareItem {
  id: string;
  name: string;
  shortDescription: string;
  categories: string[];
  releaseDate: string;
  license: string;
  logo: string | null;
}

export const SoftwareList: React.FC<{ items: SoftwareItem[]; base: string }> = ({ items, base }) => {
  return (
    <>
      {items.map((item) => (
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
