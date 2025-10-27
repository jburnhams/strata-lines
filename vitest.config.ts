import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        'vite.config.ts',
        'vitest.config.ts',
        'dist/',
        'metadata.json',
        'services/db.ts' // IndexedDB testing is complex in test environment; tested via browser usage
      ],
      include: ['services/**/*.ts'],
      thresholds: {
        lines: 80,
        functions: 85,
        branches: 70,
        statements: 80
      }
    },
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.git', '.cache']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  }
});
