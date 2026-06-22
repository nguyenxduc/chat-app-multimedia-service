import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    ALLOWED_MIME_TYPES: undefined as string[] | undefined,
    MULTIMEDIA_UPLOAD_DIR: '/tmp/uploads',
  },
}));

vi.mock('@/config/env', () => ({
  env: mockEnv,
}));

vi.mock('@/clients/chat.client', () => ({
  assertConversationParticipant: vi.fn().mockResolvedValue(undefined),
}));

import { MediaService } from '@/services/media.service';
import { assertConversationParticipant } from '@/clients/chat.client';
import type { StoredMediaMeta } from '@/types/media';

const createMockRepository = () => ({
  generateId: vi.fn().mockReturnValue('media-1'),
  ensureUploadDir: vi.fn().mockResolvedValue(undefined),
  writeBlob: vi.fn().mockResolvedValue(undefined),
  writeMeta: vi.fn().mockResolvedValue(undefined),
  readMetaOrNull: vi.fn(),
  createReadStream: vi.fn(),
  blobExistsOrNull: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(assertConversationParticipant).mockReset().mockResolvedValue(undefined);
  mockEnv.ALLOWED_MIME_TYPES = undefined;
});

describe('MediaService.saveUpload', () => {
  it('saves the upload and returns its metadata', async () => {
    const repository = createMockRepository();
    const service = new MediaService(repository as never);

    const result = await service.saveUpload({
      buffer: Buffer.from('hello'),
      mimeType: 'image/png',
      originalFilename: 'photo.png',
      ownerUserId: 'user-1',
      conversationId: 'conv-1',
    });

    expect(result).toEqual<StoredMediaMeta>({
      id: 'media-1',
      conversationId: 'conv-1',
      mimeType: 'image/png',
      size: 5,
      originalFilename: 'photo.png',
      ownerUserId: 'user-1',
      createdAt: result.createdAt,
    });
    expect(repository.writeBlob).toHaveBeenCalledWith('media-1', Buffer.from('hello'));
    expect(repository.writeMeta).toHaveBeenCalledWith('media-1', result);
  });

  it('rejects a disallowed MIME type before any I/O or participant check', async () => {
    mockEnv.ALLOWED_MIME_TYPES = ['image/png'];
    const repository = createMockRepository();
    const service = new MediaService(repository as never);

    await expect(
      service.saveUpload({
        buffer: Buffer.from('hello'),
        mimeType: 'application/pdf',
        originalFilename: 'doc.pdf',
        ownerUserId: 'user-1',
        conversationId: 'conv-1',
      }),
    ).rejects.toMatchObject({ statusCode: 415, message: 'Unsupported media type' });

    expect(assertConversationParticipant).not.toHaveBeenCalled();
    expect(repository.ensureUploadDir).not.toHaveBeenCalled();
    expect(repository.writeBlob).not.toHaveBeenCalled();
  });

  it('rejects a missing owner user id', async () => {
    const repository = createMockRepository();
    const service = new MediaService(repository as never);

    await expect(
      service.saveUpload({
        buffer: Buffer.from('hello'),
        mimeType: 'image/png',
        originalFilename: 'photo.png',
        ownerUserId: null,
        conversationId: 'conv-1',
      }),
    ).rejects.toMatchObject({ statusCode: 401, message: 'Missing user context' });

    expect(assertConversationParticipant).not.toHaveBeenCalled();
  });

  it('propagates a not-a-participant error unchanged', async () => {
    vi.mocked(assertConversationParticipant).mockRejectedValue(
      Object.assign(new Error('Not a participant of this conversation'), { statusCode: 403 }),
    );
    const repository = createMockRepository();
    const service = new MediaService(repository as never);

    await expect(
      service.saveUpload({
        buffer: Buffer.from('hello'),
        mimeType: 'image/png',
        originalFilename: 'photo.png',
        ownerUserId: 'user-1',
        conversationId: 'conv-1',
      }),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(repository.ensureUploadDir).not.toHaveBeenCalled();
  });
});

describe('MediaService.getMeta', () => {
  it('returns the metadata when found', async () => {
    const repository = createMockRepository();
    const meta: StoredMediaMeta = {
      id: 'media-1',
      conversationId: 'conv-1',
      mimeType: 'image/png',
      size: 5,
      originalFilename: 'photo.png',
      ownerUserId: 'user-1',
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    repository.readMetaOrNull.mockResolvedValue(meta);
    const service = new MediaService(repository as never);

    await expect(service.getMeta('media-1')).resolves.toEqual(meta);
  });

  it('throws a 404 HttpError when the repository returns null', async () => {
    const repository = createMockRepository();
    repository.readMetaOrNull.mockResolvedValue(null);
    const service = new MediaService(repository as never);

    await expect(service.getMeta('missing')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Media not found',
    });
  });

  it('throws a 404 HttpError when the stored id does not match the requested id', async () => {
    const repository = createMockRepository();
    repository.readMetaOrNull.mockResolvedValue({
      id: 'other-id',
      conversationId: 'conv-1',
      mimeType: 'image/png',
      size: 5,
      originalFilename: 'photo.png',
      ownerUserId: 'user-1',
      createdAt: '2024-01-01T00:00:00.000Z',
    });
    const service = new MediaService(repository as never);

    await expect(service.getMeta('media-1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Media not found',
    });
  });
});

describe('MediaService.assertCanRead', () => {
  it('resolves when the user is a participant', async () => {
    const repository = createMockRepository();
    const service = new MediaService(repository as never);
    const meta = { conversationId: 'conv-1' } as StoredMediaMeta;

    await expect(service.assertCanRead(meta, 'user-1')).resolves.toBeUndefined();
  });

  it('throws a 401 HttpError when requestUserId is missing', async () => {
    const repository = createMockRepository();
    const service = new MediaService(repository as never);
    const meta = { conversationId: 'conv-1' } as StoredMediaMeta;

    await expect(service.assertCanRead(meta, undefined)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Missing user context',
    });
    expect(assertConversationParticipant).not.toHaveBeenCalled();
  });

  it('propagates a not-a-participant error unchanged', async () => {
    vi.mocked(assertConversationParticipant).mockRejectedValue(
      Object.assign(new Error('Not a participant of this conversation'), { statusCode: 403 }),
    );
    const repository = createMockRepository();
    const service = new MediaService(repository as never);
    const meta = { conversationId: 'conv-1' } as StoredMediaMeta;

    await expect(service.assertCanRead(meta, 'user-1')).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('MediaService.assertBlobExists', () => {
  it('resolves when the blob exists', async () => {
    const repository = createMockRepository();
    repository.blobExistsOrNull.mockResolvedValue(true);
    const service = new MediaService(repository as never);

    await expect(service.assertBlobExists('media-1')).resolves.toBeUndefined();
  });

  it('throws a 404 HttpError when the blob is missing', async () => {
    const repository = createMockRepository();
    repository.blobExistsOrNull.mockResolvedValue(null);
    const service = new MediaService(repository as never);

    await expect(service.assertBlobExists('missing')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Media not found',
    });
  });
});

describe('MediaService.createReadStreamFor', () => {
  it('delegates to the repository and returns its result unchanged', () => {
    const repository = createMockRepository();
    const fakeStream = { fake: true };
    repository.createReadStream.mockReturnValue(fakeStream);
    const service = new MediaService(repository as never);

    expect(service.createReadStreamFor('media-1')).toBe(fakeStream);
    expect(repository.createReadStream).toHaveBeenCalledWith('media-1');
  });
});
