export interface SearchIndexEntry {
  id: string;
  name: string;
  shortDescription: string;
  lang?: string;
  logo: string | null;
  logoFallback: string | null;
}

export interface SearchItem extends SearchIndexEntry {
  nameLower: string;
  searchText: string;
}

// The lowercase fields repeat name and description, so the index
// leaves them out and the client derives them once per load.
export function toSearchItems(entries: SearchIndexEntry[]): SearchItem[] {
  return entries.map((entry) => ({
    ...entry,
    nameLower: entry.name.toLowerCase(),
    searchText: `${entry.name} ${entry.shortDescription}`.toLowerCase(),
  }));
}

// A failed request is evicted so the next focus or keystroke retries.
const loaded = new Map<string, Promise<SearchItem[] | null>>();

export function loadSearchIndex(url: string): Promise<SearchItem[] | null> {
  let request = loaded.get(url);
  if (!request) {
    request = fetch(url)
      .then((response) => (response.ok ? (response.json() as Promise<SearchIndexEntry[]>) : null))
      .catch(() => null)
      .then((entries) => {
        if (!Array.isArray(entries)) {
          loaded.delete(url);
          return null;
        }
        return toSearchItems(entries);
      });
    loaded.set(url, request);
  }
  return request;
}
