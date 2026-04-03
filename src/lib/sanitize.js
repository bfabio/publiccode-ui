export function safeUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url, 'https://placeholder.invalid');
    if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) return url;
  } catch {}
  return null;
}
