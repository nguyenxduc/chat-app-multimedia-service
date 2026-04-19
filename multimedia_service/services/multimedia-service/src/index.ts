import { createServer } from 'node:http';

import { createApp } from '@/app';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

const main = async () => {
  try {
    const app = createApp();
    const server = createServer(app);

    const port = env.MULTIMEDIA_SERVICE_PORT;

    server.listen(port, () => {
      logger.info({ port, uploadDir: env.MULTIMEDIA_UPLOAD_DIR }, 'Multimedia service is running');
    });

    const shutdown = () => {
      logger.info('Shutting down multimedia service...');
      server.close(() => process.exit(0));
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logger.error({ error }, 'Failed to start multimedia service');
    process.exit(1);
  }
};

void main();
