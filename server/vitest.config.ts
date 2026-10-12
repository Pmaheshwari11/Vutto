import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false, // Run test suites sequentially to share SQLite cleanly
    testTimeout: 10000
  }
});
