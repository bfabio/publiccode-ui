export interface CatalogSearchFields {
  name: string;
  shortDescription: string;
  categories: string[];
}

// The catalog page leaves this text out of the island props because it
// only repeats fields that are already sent.
export function catalogSearchText(item: CatalogSearchFields): string {
  return [item.name, item.shortDescription, ...item.categories].join(" ").toLowerCase();
}
