const SPDX_LIST_URL = 'https://raw.githubusercontent.com/spdx/license-list-data/main/json/licenses.json';

let cache = null;

async function fetchLicenseMap() {
  if (cache) return cache;

  try {
    const res = await fetch(SPDX_LIST_URL);
    const json = await res.json();
    cache = new Map(json.licenses.map((l) => [l.licenseId, l.name]));
  } catch {
    cache = new Map();
  }

  return cache;
}

export async function resolveLicense(spdxId) {
  if (!spdxId) return null;

  const map = await fetchLicenseMap();
  const name = map.get(spdxId) ?? spdxId;
  const url = map.has(spdxId)
    ? `https://spdx.org/licenses/${spdxId}.html`
    : null;

  return { id: spdxId, name, url };
}
