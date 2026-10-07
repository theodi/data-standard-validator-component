import { defineConfig } from 'vite'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

// The demo page: the element from src/, configured with the fixtures in
// demo/public/. It is what `npm run dev` serves and what the web test builds.
export default defineConfig({
  root: join(here, 'demo'),
  base: './',
  build: {
    outDir: join(here, 'demo-dist'),
    emptyOutDir: true,
    target: 'es2022',
  },
})
