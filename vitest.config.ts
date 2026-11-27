import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'packages/cli/test/**/*.test.ts'],
    environment: 'happy-dom',
    setupFiles: ['tests/unit/setup.ts'],
  },
})
