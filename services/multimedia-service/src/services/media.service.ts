import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { HttpError } from '@chatapp/common';

import { env } from '@/config/env';
import type { StoredMediaMeta } from '@/types/media';

const metaPath = (id: string) => path.join(env.MULTIMEDIA_UPLOAD_DIR, `${id}.meta.json`);
const blobPath = (id: string) => path.join(env.MULTIMEDIA_UPLOAD_DIR, `${id}.bin`);

const ensureUploadDir = async () => {
  await mkdir(env.MULTIMEDIA_UPLOAD_DIR, { recursive: true });
};

const assertMimeAllowed = (mimeType: string) => {
  const allowed = env.ALLOWED_MIME_TYPES;
  if (!allowed || allowed.length === 0) {
    return;
  }
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

    await ensureUploadDir();

    const id = randomUUID();
    const meta: StoredMediaMeta = {
      id,
      mimeType: params.mimeType,
      size: params.buffer.length,
      originalFilename: path.basename(params.originalFilename) || 'file',
      ownerUserId: params.ownerUserId,
      createdAt: new Date().toISOString(),
    };

    await writeFile(blobPath(id), params.buffer);
    await writeFile(metaPath(id), JSON.stringify(meta, null, 0), 'utf8');

    return meta;
  },

  async getMeta(id: string): Promise<StoredMediaMeta> {
    try {
      const raw = await readFile(metaPath(id), 'utf8');
      const parsed = JSON.parse(raw) as StoredMediaMeta;
      if (parsed.id !== id) {
        throw new HttpError(404, 'Media not found');
      }
      return parsed;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        throw new HttpError(404, 'Media not found');
      }
      throw e;
    }
  },

  async assertCanRead(meta: StoredMediaMeta, requestUserId: string | undefined) {
    if (!meta.ownerUserId) {
      return;
    }
    if (!requestUserId || requestUserId !== meta.ownerUserId) {
      throw new HttpError(403, 'Forbidden');
    }
  },

  createReadStreamFor(id: string) {
    return createReadStream(blobPath(id));
  },

  async assertBlobExists(id: string) {
    try {
      await stat(blobPath(id));
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        throw new HttpError(404, 'Media not found');
      }
      throw e;
    }
  },
};
