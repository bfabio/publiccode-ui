/**
 * Format a date string as a relative time (e.g. "3 days ago") for display,
 * with the full date as the <time> element's datetime attribute.
 *
 * Returns { datetime, relative, formatted } for use in templates.
 */
export function formatDate(dateStr, locale = 'en') {
  if (!dateStr) return null;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  let relative;
  if (diffDays < 1) {
    relative = rtf.format(0, 'day');
  } else if (diffDays < 30) {
    relative = rtf.format(-diffDays, 'day');
  } else if (diffDays < 365) {
    relative = rtf.format(-Math.floor(diffDays / 30), 'month');
  } else {
    relative = rtf.format(-Math.floor(diffDays / 365), 'year');
  }

  const formatted = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);

  return {
    datetime: date.toISOString().split('T')[0],
    relative,
    formatted,
  };
}
