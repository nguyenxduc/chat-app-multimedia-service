import { Router } from 'express';
import multer from 'multer';

import { getMedia, getMediaInfo, uploadMedia } from '@/controllers/media.controller';
import { env } from '@/config/env';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_BYTES },
});

export const mediaRoutes: Router = Router();

mediaRoutes.post('/', upload.single('file'), uploadMedia);
mediaRoutes.get('/:id/info', getMediaInfo);
mediaRoutes.get('/:id', getMedia);
