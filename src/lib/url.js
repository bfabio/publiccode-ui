export const base = import.meta.env.BASE_URL.replace(/\/$/, '');

// Root of the pages for a locale: links on an Italian page stay Italian.
export const localeBase = (locale) => (locale === 'it' ? `${base}/it` : base);
