const SPDX_LIST_URL = 'https://raw.githubusercontent.com/spdx/license-list-data/main/json/licenses.json';

let cachePromise = null;

function fetchLicenseMap() {
  if (!cachePromise) {
    cachePromise = (async () => {
      const res = await fetch(SPDX_LIST_URL);
      const json = await res.json();
      return new Map(json.licenses.map((l) => [l.licenseId, l.name]));
    })().catch(() => {
      // Clear so the next render retries: caching a failed fetch would
      // strip every license URL for the process lifetime.
      cachePromise = null;
      return new Map();
    });
  }
  return cachePromise;
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
