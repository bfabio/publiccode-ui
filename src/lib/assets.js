import { createHash } from 'node:crypto';
import { absoluteUrl } from './absoluteUrl.js';

const ASSET_BASE_URL = process.env.ASSETS_URL ?? 'https://bfabio.github.io/software-catalog-assets';

function assetSourceUrl(url, repoUrl) {
  if (!url || /^https?:\/\//i.test(url)) return url;

  const repo = repoUrl.replace(/\.git$/, '').toLowerCase();
  const parsed = new URL(repo);

  switch (parsed.hostname) {
    case 'github.com':
      return `https://raw.githubusercontent.com${parsed.pathname}/HEAD/${url}`;
    case 'bitbucket.org':
      return `https://bitbucket.org${parsed.pathname}/raw/HEAD/${url}`;
    default:
      return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}/-/raw/HEAD/${url}`;
  }
}

function pythonSplitExt(url) {
  const filename = url.slice(url.lastIndexOf('/') + 1);
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? '' : filename.slice(dot);
}

export function catalogAssetUrl(url) {
  if (!url) return null;

  const hash = createHash('sha1').update(url, 'utf8').digest('hex');
  const ext = encodeURI(pythonSplitExt(url));
  return `${ASSET_BASE_URL.replace(/\/$/, '')}/${hash.slice(0, 2)}/${hash.slice(2)}${ext}`;
}

export function resolveCatalogAsset(url, repoUrl) {
  const fallback = absoluteUrl(url, repoUrl);
  if (!fallback) return null;
  const source = assetSourceUrl(url, repoUrl);

  return {
    src: catalogAssetUrl(source),
    fallback,
  };
}

export function resolveLogoAsset(publiccode) {
  const desc = publiccode.description?.en
    ?? publiccode.description?.[Object.keys(publiccode.description ?? {})[0]]
    ?? {};
  const raw = publiccode.logo ?? desc.screenshots?.[0] ?? null;
  return resolveCatalogAsset(raw, publiccode.url);
}

export function resolveScreenshotAssets(publiccode, description) {
  return (description.screenshots ?? [])
    .map((s) => resolveCatalogAsset(s, publiccode.url))
    .filter(Boolean);
}
