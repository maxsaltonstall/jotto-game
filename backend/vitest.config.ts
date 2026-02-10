import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.test.ts',
        '**/*.config.ts',
        'dist/**',
        'cdk.out/**'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
        // Per-file thresholds
        'src/services/**': {
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80
        },
        'src/repositories/**': {
          lines: 70,
          functions: 70,
          branches: 65,
          statements: 70
        }
      }
    }
  }
});
