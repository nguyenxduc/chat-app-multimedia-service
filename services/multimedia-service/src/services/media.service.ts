import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

import { Client } from 'minio';

import { HttpError } from '@chatapp/common';

import { env } from '@/config/env';
import type { StoredMediaMeta } from '@/types/media';

const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

const metaKey = (id: string) => `${id}.meta.json`;

const streamToBuffer = (stream: Readable): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });

export const ensureBucket = async () => {
  const exists = await minioClient.bucketExists(env.MINIO_BUCKET);
  if (!exists) {
    await minioClient.makeBucket(env.MINIO_BUCKET);
  }
};

const assertMimeAllowed = (mimeType: string) => {
  const allowed = env.ALLOWED_MIME_TYPES;
  if (!allowed || allowed.length === 0) return;
  if (!allowed.includes(mimeType)) {
    throw new HttpError(415, 'Unsupported media type');
  }
};

export const mediaService = {
  async saveUpload(params: {
    buffer: Buffer;
    mimeType: string;
    originalFilename: string;
    ownerUserId: string | null;
  }): Promise<StoredMediaMeta> {
    assertMimeAllowed(params.mimeType);

    const id = randomUUID();
    const meta: StoredMediaMeta = {
      id,
      mimeType: params.mimeType,
      size: params.buffer.length,
      originalFilename: params.originalFilename || 'file',
      ownerUserId: params.ownerUserId,
      createdAt: new Date().toISOString(),
    };

    await minioClient.putObject(env.MINIO_BUCKET, id, params.buffer, params.buffer.length, {
      'Content-Type': params.mimeType,
    });

    const metaBuf = Buffer.from(JSON.stringify(meta));
    await minioClient.putObject(env.MINIO_BUCKET, metaKey(id), metaBuf, metaBuf.length, {
      'Content-Type': 'application/json',
    });

    return meta;
  },

  async getMeta(id: string): Promise<StoredMediaMeta> {
    try {
      const stream = await minioClient.getObject(env.MINIO_BUCKET, metaKey(id));
      const buf = await streamToBuffer(stream);
      const parsed = JSON.parse(buf.toString('utf8')) as StoredMediaMeta;
      if (parsed.id !== id) {
        throw new HttpError(404, 'Media not found');
      }
      return parsed;
    } catch (e) {
      if ((e as { code?: string }).code === 'NoSuchKey') {
        throw new HttpError(404, 'Media not found');
      }
      throw e;
    }
  },

  async assertCanRead(meta: StoredMediaMeta, requestUserId: string | undefined) {
    if (!meta.ownerUserId) return;
    if (!requestUserId || requestUserId !== meta.ownerUserId) {
      throw new HttpError(403, 'Forbidden');
    }
  },

  async getReadStream(id: string): Promise<Readable> {
    try {
      return await minioClient.getObject(env.MINIO_BUCKET, id);
    } catch (e) {
      if ((e as { code?: string }).code === 'NoSuchKey') {
        throw new HttpError(404, 'Media not found');
      }
      throw e;
    }
  },

  async assertBlobExists(id: string) {
    try {
      await minioClient.statObject(env.MINIO_BUCKET, id);
    } catch (e) {
      if ((e as { code?: string }).code === 'NoSuchKey') {
        throw new HttpError(404, 'Media not found');
      }
      throw e;
    }
  },
};
