export const LANG_KEY = 'publiccode-ui:lang';

// Runs inline in <head>, serialized with Function.prototype.toString, so it
// must not reference anything outside its own body.
export function localeRedirect({ pathname, search, hash = '', current, navLang, stored, base }) {
  const supported = ['en', 'it'];
  const params = new URLSearchParams(search);
  const param = params.get('lang');
  const chosen = supported.includes(param) ? param : null;
  const lang = chosen
    || (supported.includes(stored) ? stored : null)
    || supported.find((s) => navLang === s || navLang.startsWith(`${s}-`));
  let target = null;
  if (lang && lang !== current) {
    const rel = pathname.slice(base.length).replace(/^\/it(?=\/|$)/, '') || '/';
    const path = `${base}${lang === 'it' ? '/it' : ''}${rel}`;
    // Keep the search query and filters; ?lang= is stored, not carried over.
    params.delete('lang');
    const query = params.toString();
    if (path !== pathname) target = `${path}${query ? `?${query}` : ''}${hash}`;
  }
  return { store: chosen, target };
}

export function localeRedirectScript(base) {
  const key = JSON.stringify(LANG_KEY);
  return `{
  let stored = null;
  try { stored = localStorage.getItem(${key}); } catch {}
  const r = (${localeRedirect})({
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    current: document.documentElement.lang || 'en',
    navLang: navigator.language || '',
    stored,
    base: ${JSON.stringify(base)},
  });
  if (r.store) try { localStorage.setItem(${key}, r.store); } catch {}
  if (r.target) location.replace(r.target);
}`;
}
