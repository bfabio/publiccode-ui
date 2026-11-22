export function relativeDate(dateStr, locale = 'en') {
  if (!dateStr) return null;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  const diffDays = Math.floor((Date.now() - date) / (1000 * 60 * 60 * 24));
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffDays < 1) return rtf.format(0, 'day');
  if (diffDays < 30) return rtf.format(-diffDays, 'day');
  if (diffDays < 365) return rtf.format(-Math.floor(diffDays / 30), 'month');
  return rtf.format(-Math.floor(diffDays / 365), 'year');
}

// A date without a time, such as a publiccode.yml releaseDate, names a
// calendar day. new Date() reads it as UTC midnight, so formatting it in the
// browser time zone shows the previous day west of UTC and makes the client
// text differ from the text rendered at build time.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function formatDate(dateStr, locale = 'en') {
  if (!dateStr) return null;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  const formatted = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(DATE_ONLY.test(dateStr) && { timeZone: 'UTC' }),
  }).format(date);

  return {
    datetime: date.toISOString().split('T')[0],
    formatted,
  };
}
