export type SortBy = "name_asc" | "name_desc" | "release_date_desc" | "release_date_asc" | "activity_desc" | "activity_asc";

export type SortDirection = "asc" | "desc";

export interface SortableSoftware {
  id: string;
  name: string;
  releaseDate: string;
}

type Comparator = (a: SortableSoftware, b: SortableSoftware) => number;

const matchRank = (name: string, query: string): number => {
  const n = name.toLowerCase();
  const q = query.toLowerCase();
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  if (n.includes(q)) return 2;
  return 3;
};

const byRank = (query?: string): Comparator => (a, b) =>
  query ? matchRank(a.name, query) - matchRank(b.name, query) : 0;

const byName: Comparator = (a, b) => a.name.localeCompare(b.name);

const byRelease = (direction: SortDirection): Comparator => (a, b) => {
  if (!a.releaseDate && !b.releaseDate) return 0;
  if (!a.releaseDate) return 1;
  if (!b.releaseDate) return -1;
  return direction === "asc" ? a.releaseDate.localeCompare(b.releaseDate) : b.releaseDate.localeCompare(a.releaseDate);
};

const byScore = (scores: Map<string, number | null>, direction: SortDirection): Comparator => (a, b) => {
  const sa = scores.get(a.id) ?? null;
  const sb = scores.get(b.id) ?? null;
  if (sa === null && sb === null) return 0;
  if (sa === null) return 1;
  if (sb === null) return -1;
  return direction === "asc" ? sa - sb : sb - sa;
};

const compose = (...comparators: Comparator[]): Comparator => (a, b) => {
  for (const compare of comparators) {
    const result = compare(a, b);
    if (result) return result;
  }
  return 0;
};

const comparatorFor = (sortBy: SortBy, scores: Map<string, number | null>): Comparator | null => {
  switch (sortBy) {
    case "name_asc":
      return byName;
    case "name_desc":
      return (a, b) => byName(b, a);
    case "release_date_desc":
      return byRelease("desc");
    case "release_date_asc":
      return byRelease("asc");
    case "activity_desc":
      return byScore(scores, "desc");
    case "activity_asc":
      return byScore(scores, "asc");
    default:
      return null;
  }
};

export const sortByScores = <T extends SortableSoftware>(items: T[], scores: Map<string, number | null>, direction: SortDirection, query?: string): T[] =>
  items.toSorted(compose(byScore(scores, direction), byRank(query), byName));

export const sortItems = <T extends SortableSoftware>(items: T[], sortBy: SortBy, scores?: Map<string, number | null>, query?: string, relevanceFirst = false): T[] => {
  const picked = comparatorFor(sortBy, scores ?? new Map());
  if (!picked) return [...items];
  const rank = byRank(query);
  return items.toSorted(relevanceFirst ? compose(rank, picked, byName) : compose(picked, rank, byName));
};
