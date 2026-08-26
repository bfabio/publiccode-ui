export function safeUrl(url) {
  if (!url || !URL.canParse(url, 'https://placeholder.invalid')) return null;
  const parsed = new URL(url, 'https://placeholder.invalid');
  return ['http:', 'https:', 'mailto:'].includes(parsed.protocol) ? url : null;
}
