import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/scripts/**', 'src/server.ts'],
    },
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      '@medstore/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
