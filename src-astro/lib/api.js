import yaml from 'js-yaml';

const BASE_URL = 'https://api.developers.italia.it/v1';

let cache = null;

export async function fetchAllSoftware() {
  if (cache) return cache;

  const items = [];
  let next = `${BASE_URL}/software`;

  while (next) {
    const res = await fetch(next);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();

    for (const item of json.data) {
      items.push({
        id: item.id,
        publiccode: yaml.load(item.publiccodeYml),
      });
    }

    next = json.links?.next
      ? `${BASE_URL}/software${json.links.next}`
      : null;
  }

  cache = items;
  return cache;
}
