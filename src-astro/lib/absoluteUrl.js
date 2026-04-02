import path from 'node:path';

export function absoluteUrl(url, repoUrl) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;

  try {
    const repo = new URL(repoUrl.replace(/\.git$/, ''));
    switch (repo.host.toLowerCase()) {
      case 'github.com':
        return 'https://raw.githubusercontent.com' + path.join(repo.pathname, 'HEAD', url);
      case 'bitbucket.org':
        return 'https://bitbucket.org' + path.join(repo.pathname, 'raw/HEAD', url);
      default:
        return `${repo.protocol}//${repo.hostname}` + path.join(repo.pathname, '-/raw/HEAD', url);
    }
  } catch {
    return null;
  }
}

export function resolveLogo(publiccode) {
  const desc = publiccode.description?.en
    ?? publiccode.description?.[Object.keys(publiccode.description ?? {})[0]]
    ?? {};
  const raw = publiccode.logo ?? desc.screenshots?.[0] ?? null;
  return absoluteUrl(raw, publiccode.url);
}
