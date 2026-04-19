import { USER_ID_HEADER } from '@chatapp/common';
import type { RequestHandler } from 'express';

import { mediaService } from '@/services/media.service';
import { mediaIdParamsSchema } from '@/validation/media.schema';

export const uploadMedia: RequestHandler = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ message: 'Missing file field "file"' });
      return;
    }

    const ownerHeader = req.headers[USER_ID_HEADER];
    const ownerUserId =
      typeof ownerHeader === 'string' && ownerHeader.trim().length > 0 ? ownerHeader.trim() : null;

    const meta = await mediaService.saveUpload({
      buffer: file.buffer,
      mimeType: file.mimetype || 'application/octet-stream',
      originalFilename: file.originalname,
      ownerUserId,
    });

    res.status(201).json({ data: meta });
  } catch (e) {
    next(e);
  }
};

export const getMedia: RequestHandler = async (req, res, next) => {
  try {
    const { id } = mediaIdParamsSchema.parse(req.params);
    const meta = await mediaService.getMeta(id);

    const requester = req.headers[USER_ID_HEADER];
    const requestUserId = typeof requester === 'string' ? requester : undefined;
    await mediaService.assertCanRead(meta, requestUserId);

    await mediaService.assertBlobExists(id);

    res.setHeader('Content-Type', meta.mimeType);
    res.setHeader('Content-Length', String(meta.size));
    const safeName = meta.originalFilename.replace(/["\r\n]/g, '_');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);

    const stream = mediaService.createReadStreamFor(id);
    stream.on('error', next);
    stream.pipe(res);
  } catch (e) {
    next(e);
  }
};

export const getMediaInfo: RequestHandler = async (req, res, next) => {
  try {
    const { id } = mediaIdParamsSchema.parse(req.params);
    const meta = await mediaService.getMeta(id);

    const requester = req.headers[USER_ID_HEADER];
    const requestUserId = typeof requester === 'string' ? requester : undefined;
    await mediaService.assertCanRead(meta, requestUserId);

    res.json({ data: meta });
  } catch (e) {
    next(e);
  }
};
