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

export function formatDate(dateStr, locale = 'en') {
  if (!dateStr) return null;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  const formatted = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);

  return {
    datetime: date.toISOString().split('T')[0],
    formatted,
  };
}
