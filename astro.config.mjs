import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://bfabio.github.io',
  base: process.env.BASE_PATH ?? '/',
  integrations: [react()],
  outDir: './dist-astro',
  srcDir: './src-astro',
});
