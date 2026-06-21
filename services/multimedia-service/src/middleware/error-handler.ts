import { HttpError } from '@chatapp/common';

import type { ErrorRequestHandler } from 'express';
import { MulterError } from 'multer';
import { logger } from '@/utils/logger';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ message: 'File too large' });
      return;
    }
    res.status(400).json({ message: err.message });
    return;
  }

  logger.error({ err }, 'Unhandled error occurred');

  const error = err instanceof HttpError ? err : undefined;
  const statusCode = error?.statusCode ?? 500;
  const message = statusCode >= 500 ? 'Internal Server Error' : (error?.message ?? 'Unknown Error');
  const payload = error?.details ? { message, details: error.details } : { message };

  res.status(statusCode).json(payload);

  void _next();
};
