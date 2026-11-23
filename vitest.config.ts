import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // tsconfig keeps JSX as is for Astro, so component tests need the transform.
  oxc: { jsx: { runtime: 'automatic', importSource: 'react' } },
  test: {
    exclude: [...configDefaults.exclude, '.worktrees/**'],
  },
});
