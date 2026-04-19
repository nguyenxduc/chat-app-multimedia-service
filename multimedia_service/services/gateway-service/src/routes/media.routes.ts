import { Router } from 'express';
import multer from 'multer';

import { getMediaInfoHandler, getMediaStreamHandler, uploadMediaHandler } from '@/controllers/media.controller';
import { requireAuth } from '@/middleware/require-auth';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const mediaRouter: Router = Router();

mediaRouter.use(requireAuth);

mediaRouter.post('/', upload.single('file'), uploadMediaHandler);
mediaRouter.get('/:id/info', getMediaInfoHandler);
mediaRouter.get('/:id', getMediaStreamHandler);
