import path from 'node:path';

import { HttpError } from '@chatapp/common';

import { assertConversationParticipant } from '@/clients/chat.client';
import { env } from '@/config/env';
import { mediaRepository, MediaRepository } from '@/repositories/media.repository';
import type { StoredMediaMeta } from '@/types/media';
import { logger } from '@/utils/logger';

const assertMimeAllowed = (mimeType: string) => {
  const allowed = env.ALLOWED_MIME_TYPES;
  if (!allowed || allowed.length === 0) {
    return;
  }
  if (!allowed.includes(mimeType)) {
    throw new HttpError(415, 'Unsupported media type');
  }
};

export class MediaService {
  constructor(private readonly repository: MediaRepository) {}

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
    await this.repository.ensureUploadDir();

    const id = this.repository.generateId();
    const meta: StoredMediaMeta = {
      id,
      conversationId: params.conversationId,
      mimeType: params.mimeType,
      size: params.buffer.length,
      originalFilename: path.basename(params.originalFilename) || 'file',
      ownerUserId: params.ownerUserId,
      createdAt: new Date().toISOString(),
    };

    await this.repository.writeBlob(id, params.buffer);
    await this.repository.writeMeta(id, meta);

    logger.info({ mediaId: id, conversationId: params.conversationId }, 'Media saved to storage');

    return meta;
  }

  async getMeta(id: string): Promise<StoredMediaMeta> {
    const parsed = await this.repository.readMetaOrNull(id);
    if (!parsed || parsed.id !== id) {
      logger.warn({ mediaId: id }, 'Media metadata not found');
      throw new HttpError(404, 'Media not found');
    }
    return parsed;
  }

  async assertCanRead(meta: StoredMediaMeta, requestUserId: string | undefined): Promise<void> {
    if (!requestUserId) {
      throw new HttpError(401, 'Missing user context');
    }
    await assertConversationParticipant(meta.conversationId, requestUserId);
  }

  createReadStreamFor(id: string) {
    return this.repository.createReadStream(id);
  }

  async assertBlobExists(id: string): Promise<void> {
    const exists = await this.repository.blobExistsOrNull(id);
    if (!exists) {
      logger.warn({ mediaId: id }, 'Media blob not found');
      throw new HttpError(404, 'Media not found');
    }
  }
}

export const mediaService = new MediaService(mediaRepository);
