export const LANG_KEY = 'publiccode-ui:lang';

// Runs inline in <head>, serialized with Function.prototype.toString, so it
// must not reference anything outside its own body.
export function localeRedirect({ pathname, search, current, navLang, stored, base }) {
  const supported = ['en', 'it'];
  const param = new URLSearchParams(search).get('lang');
  const chosen = supported.includes(param) ? param : null;
  const lang = chosen
    || (supported.includes(stored) ? stored : null)
    || supported.find((s) => navLang === s || navLang.startsWith(`${s}-`));
  let target = null;
  if (lang && lang !== current) {
    const rel = pathname.slice(base.length).replace(/^\/it(?=\/|$)/, '') || '/';
    const path = `${base}${lang === 'it' ? '/it' : ''}${rel}`;
    if (path !== pathname) target = path;
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
    current: document.documentElement.lang || 'en',
    navLang: navigator.language || '',
    stored,
    base: ${JSON.stringify(base)},
  });
  if (r.store) try { localStorage.setItem(${key}, r.store); } catch {}
  if (r.target) {
    const params = new URLSearchParams(location.search);
    params.delete('lang');
    const qs = params.toString();
    location.replace(r.target + (qs ? '?' + qs : '') + (location.hash || ''));
  }
}`;
}
