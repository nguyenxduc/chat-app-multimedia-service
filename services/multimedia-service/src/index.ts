import { createServer } from 'node:http';

import { createApp } from '@/app';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { ensureBucket } from '@/services/media.service';

const main = async () => {
  try {
    await ensureBucket();
    logger.info({ bucket: env.MINIO_BUCKET }, 'MinIO bucket ready');

    const app = createApp();
    const server = createServer(app);

    const port = env.MULTIMEDIA_SERVICE_PORT;

    server.listen(port, () => {
      logger.info({ port }, 'Multimedia service is running');
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
