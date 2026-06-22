import os from 'node:os';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

// e2e tests only need the local filesystem (a temp upload dir) and a stub
// "chat-service" HTTP server started by the test itself (see e2e/media.e2e.test.ts)
// — no real database is required for this service.
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['e2e/**/*.e2e.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    env: {
      NODE_ENV: 'test',
      INTERNAL_API_TOKEN: 'e2e-test-internal-api-token-16ch',
      MULTIMEDIA_UPLOAD_DIR: path.join(os.tmpdir(), 'multimedia-service-e2e'),
      CHAT_SERVICE_URL: 'http://127.0.0.1:4567',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
