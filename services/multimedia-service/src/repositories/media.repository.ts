import { randomUUID } from 'node:crypto';
import { PassThrough, Readable } from 'node:stream';

import { Client } from 'minio';

import { env } from '@/config/env';
import type { IMediaRepository } from '@/services/media.service';
import type { StoredMediaMeta } from '@/types/media';

const metaKey = (id: string) => `${id}.meta.json`;

// Lazy client — created on first use so tests that mock env work correctly.
let _client: Client | undefined;
function getClient(): Client {
  if (!_client) {
    _client = new Client({
      endPoint: env.MINIO_ENDPOINT,
      ...(env.MINIO_PORT !== undefined && { port: env.MINIO_PORT }),
      useSSL: env.MINIO_USE_SSL,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    });
  }
  return _client;
}

const streamToBuffer = (stream: Readable): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });

export class MediaRepository implements IMediaRepository {
  generateId(): string {
    return randomUUID();
  }

  async ensureUploadDir(): Promise<void> {
    const client = getClient();
    const exists = await client.bucketExists(env.MINIO_BUCKET);
    if (!exists) {
      await client.makeBucket(env.MINIO_BUCKET);
    }
  }

  async writeBlob(id: string, buffer: Buffer): Promise<void> {
    await getClient().putObject(env.MINIO_BUCKET, id, buffer, buffer.length);
  }

  async writeMeta(id: string, meta: StoredMediaMeta): Promise<void> {
    const metaBuf = Buffer.from(JSON.stringify(meta));
    await getClient().putObject(env.MINIO_BUCKET, metaKey(id), metaBuf, metaBuf.length, {
      'Content-Type': 'application/json',
    });
  }

  async readMetaOrNull(id: string): Promise<StoredMediaMeta | null> {
    try {
      const stream = await getClient().getObject(env.MINIO_BUCKET, metaKey(id));
      const buf = await streamToBuffer(stream);
      return JSON.parse(buf.toString('utf8')) as StoredMediaMeta;
    } catch (e) {
      if ((e as { code?: string }).code === 'NoSuchKey') {
        return null;
      }
      throw e;
    }
  }

  createReadStream(id: string): Readable {
    const pass = new PassThrough();
    getClient()
      .getObject(env.MINIO_BUCKET, id)
      .then((stream) => stream.pipe(pass))
      .catch((err) => pass.destroy(err as Error));
    return pass;
  }

  async blobExistsOrNull(id: string): Promise<true | null> {
    try {
      await getClient().statObject(env.MINIO_BUCKET, id);
      return true;
    } catch (e) {
      if ((e as { code?: string }).code === 'NoSuchKey') {
        return null;
      }
      throw e;
    }
  }
}

export const mediaRepository = new MediaRepository();
