import type { Router } from 'express';
import { mediaRoutes } from '@/routes/media.routes';

export const registerRoutes = (app: Router) => {
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'multimedia-service' });
  });

  app.use('/media', mediaRoutes);
};
