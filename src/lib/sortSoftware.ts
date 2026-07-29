export type SortBy = "name_asc" | "name_desc" | "release_date_desc" | "release_date_asc" | "activity_desc" | "activity_asc";

export interface SortableSoftware {
  id: string;
  name: string;
  releaseDate: string;
}

export const sortItems = <T extends SortableSoftware>(items: T[], sortBy: SortBy, scores?: Map<string, number | null>): T[] => {
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
    case "activity_desc":
    case "activity_asc":
      sorted.sort((a, b) => {
        const sa = scores?.get(a.id) ?? null;
        const sb = scores?.get(b.id) ?? null;
        if (sa === null && sb === null) return a.name.localeCompare(b.name);
        if (sa === null) return 1;
        if (sb === null) return -1;
        const byScore = sortBy === "activity_asc" ? sa - sb : sb - sa;
        return byScore || a.name.localeCompare(b.name);
      });
      break;
  }
  return sorted;
};
