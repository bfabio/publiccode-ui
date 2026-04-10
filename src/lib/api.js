import yaml from 'js-yaml';

const API_URL = process.env.API_URL;

export const apiConfigured = !!API_URL;

let cache = null;

export async function fetchAllSoftware() {
  if (!API_URL) return [];
  if (cache) return cache;

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
      items.push({ id: item.id, publiccode });
    }

    next = json.links?.next
      ? `${API_URL}/software${json.links.next}`
      : null;
  }

  cache = items;
  return cache;
}
