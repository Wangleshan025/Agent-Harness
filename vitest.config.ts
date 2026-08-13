import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // In ESM-style imports, .js extension maps to .ts source files
      // This is needed for vitest to resolve imports like '../../src/config/loader.js'
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
    },
    server: {
      deps: {
        inline: [],
      },
    },
  },
})