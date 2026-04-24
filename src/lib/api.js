import yaml from 'js-yaml';

const API_URL = process.env.API_URL;

export const apiConfigured = !!API_URL;

let softwareCache = null;
let catalogsCache = null;
let logsCache = null;
const analysisCache = new Map();

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

export async function fetchLogs({ days = 3 } = {}) {
  if (!API_URL) return [];
  if (logsCache) return logsCache;

  const from = new Date(Date.now() - days * 86400000).toISOString();
  const logs = [];
  let next = `${API_URL}/logs?from=${from}&page[size]=100`;

  while (next) {
    const res = await fetch(next);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();

    logs.push(...json.data);

    next = json.links?.next
      ? `${API_URL}/logs${json.links.next}`
      : null;
  }

  logsCache = logs;
  return logsCache;
}

export async function fetchAnalysis(id) {
  if (!API_URL) return null;
  if (analysisCache.has(id)) return analysisCache.get(id);

  try {
    const res = await fetch(`${API_URL}/software/${id}/analysis`);
    if (!res.ok) {
      analysisCache.set(id, null);
      return null;
    }
    const json = await res.json();
    const result = json['opencode-badges']?.results ?? null;
    analysisCache.set(id, result);
    return result;
  } catch {
    analysisCache.set(id, null);
    return null;
  }
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
