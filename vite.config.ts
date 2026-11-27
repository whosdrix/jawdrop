import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const repo = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: 'site',
  base: process.env.BASE_PATH ?? '/',
  build: {
    outDir: '../dist/site',
    emptyOutDir: true,
  },
  server: {
    fs: { allow: [repo] },
  },
})
