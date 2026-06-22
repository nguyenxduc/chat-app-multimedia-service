import { randomUUID } from 'node:crypto';
import { createReadStream, type ReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { env } from '@/config/env';
import type { StoredMediaMeta } from '@/types/media';

const metaPath = (id: string) => path.join(env.MULTIMEDIA_UPLOAD_DIR, `${id}.meta.json`);
const blobPath = (id: string) => path.join(env.MULTIMEDIA_UPLOAD_DIR, `${id}.bin`);

export class MediaRepository {
  generateId(): string {
    return randomUUID();
  }

  async ensureUploadDir(): Promise<void> {
    await mkdir(env.MULTIMEDIA_UPLOAD_DIR, { recursive: true });
  }

  async writeBlob(id: string, buffer: Buffer): Promise<void> {
    await writeFile(blobPath(id), buffer);
  }

  async writeMeta(id: string, meta: StoredMediaMeta): Promise<void> {
    await writeFile(metaPath(id), JSON.stringify(meta, null, 0), 'utf8');
  }

  async readMetaOrNull(id: string): Promise<StoredMediaMeta | null> {
    try {
      const raw = await readFile(metaPath(id), 'utf8');
      return JSON.parse(raw) as StoredMediaMeta;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        return null;
      }
      throw e;
    }
  }

  createReadStream(id: string): ReadStream {
    return createReadStream(blobPath(id));
  }

  async blobExistsOrNull(id: string): Promise<true | null> {
    try {
      await stat(blobPath(id));
      return true;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        return null;
      }
      throw e;
    }
  }
}

export const mediaRepository = new MediaRepository();
