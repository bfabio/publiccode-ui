export type SortBy = "name_asc" | "name_desc" | "release_date_desc" | "release_date_asc" | "activity_desc" | "activity_asc";

export type SortDirection = "asc" | "desc";

export interface SortableSoftware {
  id: string;
  name: string;
  releaseDate: string;
}

const matchRank = (name: string, query: string): number => {
  const n = name.toLowerCase();
  const q = query.toLowerCase();
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  return 2;
};

const tiebreak = (query?: string) => (a: SortableSoftware, b: SortableSoftware): number =>
  (query ? matchRank(a.name, query) - matchRank(b.name, query) : 0) || a.name.localeCompare(b.name);

export const sortByScores = <T extends SortableSoftware>(items: T[], scores: Map<string, number | null>, direction: SortDirection, query?: string): T[] => {
  const tie = tiebreak(query);
  const sorted = [...items];
  sorted.sort((a, b) => {
    const sa = scores.get(a.id) ?? null;
    const sb = scores.get(b.id) ?? null;
    if (sa === null && sb === null) return tie(a, b);
    if (sa === null) return 1;
    if (sb === null) return -1;
    const byScore = direction === "asc" ? sa - sb : sb - sa;
    return byScore || tie(a, b);
  });
  return sorted;
};

export const sortItems = <T extends SortableSoftware>(items: T[], sortBy: SortBy, scores?: Map<string, number | null>, query?: string): T[] => {
  const tie = tiebreak(query);
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
        if (!a.releaseDate && !b.releaseDate) return tie(a, b);
        if (!a.releaseDate) return 1;
        if (!b.releaseDate) return -1;
        return b.releaseDate.localeCompare(a.releaseDate) || tie(a, b);
      });
      break;
    case "release_date_asc":
      sorted.sort((a, b) => {
        if (!a.releaseDate && !b.releaseDate) return tie(a, b);
        if (!a.releaseDate) return 1;
        if (!b.releaseDate) return -1;
        return a.releaseDate.localeCompare(b.releaseDate) || tie(a, b);
      });
      break;
    case "activity_desc":
    case "activity_asc":
      return sortByScores(items, scores ?? new Map(), sortBy === "activity_asc" ? "asc" : "desc", query);
  }
  return sorted;
};
