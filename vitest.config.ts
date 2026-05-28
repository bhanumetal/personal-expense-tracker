import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['__tests__/setup.ts'],
    include: ['__tests__/**/*.test.ts'],
    exclude: ['node_modules'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts', 'app/api/**/*.ts', 'middleware.ts'],
      exclude: ['lib/models/**', 'lib/db.ts', 'node_modules'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
