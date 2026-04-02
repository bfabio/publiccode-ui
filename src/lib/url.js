// import.meta.env.BASE_URL is "/" locally and "/publiccode-ui/" on GitHub Pages.
// Strip trailing slash so we can write: base + "/software/..."
export const base = import.meta.env.BASE_URL.replace(/\/$/, '');
