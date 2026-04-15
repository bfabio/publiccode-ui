import yaml from 'js-yaml';

const API_URL = process.env.API_URL;

export const apiConfigured = !!API_URL;

let softwareCache = null;
let catalogsCache = null;

export async function fetchAllSoftware() {
  if (!API_URL) return [];
  if (softwareCache) return softwareCache;

  const items = [];
  let next = `${API_URL}/software`;

  while (next) {
    const res = await fetch(next);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();

    for (const item of json.data) {
      let publiccode;
      try {
        publiccode = yaml.load(item.publiccodeYml);
      } catch (e) {
        console.warn(`Skipping ${item.id}: invalid YAML:`, e.message);
        continue;
      }
      items.push({ id: item.id, catalogId: item.catalogId ?? null, publiccode });
    }

    next = json.links?.next
      ? `${API_URL}/software${json.links.next}`
      : null;
  }

  softwareCache = items;
  return softwareCache;
}

export async function fetchCatalogs() {
  if (!API_URL) return [];
  if (catalogsCache) return catalogsCache;

  try {
    const res = await fetch(`${API_URL}/catalogs`);
    if (!res.ok) return [];
    const json = await res.json();
    catalogsCache = (json.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.alternativeId ?? c.id,
    }));
  } catch {
    catalogsCache = [];
  }

  return catalogsCache;
}
