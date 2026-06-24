import { Readable } from 'node:stream';

import { HttpError } from '@chatapp/common';

import { assertConversationParticipant } from '@/clients/chat.client';
import { env } from '@/config/env';
import type { StoredMediaMeta } from '@/types/media';

export interface IMediaRepository {
  generateId(): string;
  ensureUploadDir(): Promise<void>;
  writeBlob(id: string, buffer: Buffer): Promise<void>;
  writeMeta(id: string, meta: StoredMediaMeta): Promise<void>;
  readMetaOrNull(id: string): Promise<StoredMediaMeta | null>;
  createReadStream(id: string): Readable;
  blobExistsOrNull(id: string): Promise<true | null>;
}

const assertMimeAllowed = (mimeType: string) => {
  const allowed = env.ALLOWED_MIME_TYPES;
  if (!allowed || allowed.length === 0) return;
  if (!allowed.includes(mimeType)) {
    throw new HttpError(415, 'Unsupported media type');
  }
};

export class MediaService {
  constructor(private readonly repository: IMediaRepository) {}

  async saveUpload(params: {
    buffer: Buffer;
    mimeType: string;
    originalFilename: string;
    ownerUserId: string | null;
    conversationId: string;
  }): Promise<StoredMediaMeta> {
    assertMimeAllowed(params.mimeType);

    if (!params.ownerUserId) {
      throw new HttpError(401, 'Missing user context');
    }

    await assertConversationParticipant(params.conversationId, params.ownerUserId);

    const id = this.repository.generateId();
    const meta: StoredMediaMeta = {
      id,
      conversationId: params.conversationId,
      mimeType: params.mimeType,
      size: params.buffer.length,
      originalFilename: params.originalFilename || 'file',
      ownerUserId: params.ownerUserId,
      createdAt: new Date().toISOString(),
    };

    await this.repository.ensureUploadDir();
    await this.repository.writeBlob(id, params.buffer);
    await this.repository.writeMeta(id, meta);

    return meta;
  }

  async getMeta(id: string): Promise<StoredMediaMeta> {
    const meta = await this.repository.readMetaOrNull(id);
    if (!meta || meta.id !== id) {
      throw new HttpError(404, 'Media not found');
    }
    return meta;
  }

  async assertCanRead(meta: StoredMediaMeta, requestUserId: string | undefined): Promise<void> {
    if (!requestUserId) {
      throw new HttpError(401, 'Missing user context');
    }
    await assertConversationParticipant(meta.conversationId, requestUserId);
  }

  createReadStreamFor(id: string): Readable {
    return this.repository.createReadStream(id);
  }

  async getReadStream(id: string): Promise<Readable> {
    return this.repository.createReadStream(id);
  }

  async assertBlobExists(id: string): Promise<void> {
    const exists = await this.repository.blobExistsOrNull(id);
    if (!exists) {
      throw new HttpError(404, 'Media not found');
    }
  }
}

import { mediaRepository } from '@/repositories/media.repository';
export const mediaService = new MediaService(mediaRepository);
