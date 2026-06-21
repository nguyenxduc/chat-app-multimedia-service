import type { RequestHandler } from 'express';

import { multimediaProxyService } from '@/services/multimedia-proxy.service';
import { getAuthenticatedUser } from '@/utils/auth';
import { mediaIdParamsSchema, conversationIdHeaderSchema } from '@/validation/media.schema';
import { asyncHandler, HttpError } from '@chatapp/common';

export const uploadMediaHandler: RequestHandler = asyncHandler(async (req, res) => {
  const user = getAuthenticatedUser(req);
  const file = req.file;
  if (!file) {
    throw new HttpError(400, 'Missing file field "file"');
  }

  const rawConversationId = req.headers['x-conversation-id'];
  const conversationId = conversationIdHeaderSchema.parse(
    typeof rawConversationId === 'string' ? rawConversationId.trim() : rawConversationId,
  );

  const meta = await multimediaProxyService.uploadMedia(user.id, conversationId, {
    buffer: file.buffer,
    mimetype: file.mimetype || 'application/octet-stream',
    originalname: file.originalname,
  });

  res.status(201).json({ data: meta });
});

export const getMediaInfoHandler: RequestHandler = asyncHandler(async (req, res) => {
  const user = getAuthenticatedUser(req);
  const { id } = mediaIdParamsSchema.parse(req.params);
  const meta = await multimediaProxyService.getMediaInfo(user.id, id);
  res.json({ data: meta });
});

export const getMediaStreamHandler: RequestHandler = asyncHandler(async (req, res, next) => {
  const user = getAuthenticatedUser(req);
  const { id } = mediaIdParamsSchema.parse(req.params);
  const upstream = await multimediaProxyService.getMediaStream(user.id, id);

  const headers = upstream.headers;
  const ct = headers['content-type'];
  if (typeof ct === 'string') {
    res.setHeader('Content-Type', ct);
  }
  const cl = headers['content-length'];
  if (typeof cl === 'string') {
    res.setHeader('Content-Length', cl);
  }
  const cd = headers['content-disposition'];
  if (typeof cd === 'string') {
    res.setHeader('Content-Disposition', cd);
  }

  upstream.data.on('error', next);
  upstream.data.pipe(res);
});
