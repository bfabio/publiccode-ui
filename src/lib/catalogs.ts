export interface Catalog {
  id: string;
  name: string;
  slug: string;
}

// The API exposes the aggregate of every catalog as one more catalog
// with this slug. No software belongs to it, so it is no filter value.
export const ROOT_CATALOG_SLUG = '∅';

export function parseCatalogs(data: unknown): Catalog[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((c) => ({ id: c.id, name: c.name, slug: c.alternativeId ?? c.id }))
    .filter((c) => c.slug !== ROOT_CATALOG_SLUG);
}
