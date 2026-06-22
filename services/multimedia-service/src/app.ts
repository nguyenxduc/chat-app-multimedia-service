import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createInternalAuthMiddleware } from '@chatapp/common';

import { errorHandler } from '@/middleware/error-handler';
import { env } from '@/config/env';
import { registerRoutes } from '@/routes';

export const createApp = (): Application => {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: '*',
      credentials: true,
    }),
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    createInternalAuthMiddleware(env.INTERNAL_API_TOKEN, {
      exemptPaths: ['/health'],
    }),
  );

  registerRoutes(app);

  app.use((_req, res) => {
    res.status(404).json({ message: 'Not Found' });
  });

  app.use(errorHandler);

  return app;
};
