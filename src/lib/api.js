import yaml from 'js-yaml';
import { parseSoftwareActivity, parseCatalogActivity } from './activity.ts';

const API_URL = process.env.API_URL;

export const apiConfigured = !!API_URL;

let softwareCache = null;
let catalogsCache = null;
let logsCache = null;
let softwareAnalysisCache = null;
let catalogAnalysisCache = null;

async function mapLimit(items, limit, fn) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      await fn(items[i]);
    }
  });
  await Promise.all(workers);
}

export async function fetchAllSoftware() {
  if (!API_URL) return [];
  if (softwareCache) return softwareCache;

  const items = [];
  let next = `${API_URL}/software?page[size]=100`;

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
      ? `${API_URL}/logs${json.links.next}&page[size]=100&from=${from}`
      : null;
  }

  logsCache = logs;
  return logsCache;
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

async function fetchActivity(path, extract) {
  try {
    const res = await fetch(`${API_URL}${path}`);
    if (!res.ok) return null;
    const json = await res.json();
    const payload = json?.data ?? json;
    return extract(payload) ?? null;
  } catch {
    return null;
  }
}

export async function fetchAllSoftwareAnalysis() {
  if (!API_URL) return new Map();
  if (softwareAnalysisCache) return softwareAnalysisCache;

  const software = await fetchAllSoftware();
  const map = new Map();
  await mapLimit(software, 8, async (s) => {
    map.set(s.id, await fetchActivity(`/software/${s.id}/analysis`, parseSoftwareActivity));
  });

  softwareAnalysisCache = map;
  return map;
}

export async function fetchAllCatalogAnalysis() {
  if (!API_URL) return new Map();
  if (catalogAnalysisCache) return catalogAnalysisCache;

  const catalogs = await fetchCatalogs();
  const map = new Map();
  await mapLimit(catalogs, 4, async (c) => {
    map.set(c.id, await fetchActivity(`/catalogs/${c.id}/analysis`, parseCatalogActivity));
  });

  catalogAnalysisCache = map;
  return map;
}
