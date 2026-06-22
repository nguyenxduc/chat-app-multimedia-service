import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { rm } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { createApp } from '@/app';
import { env } from '@/config/env';

const ALLOWED_CONVERSATION_ID = randomUUID();
const DENIED_CONVERSATION_ID = randomUUID();

const app = createApp();
let chatServiceStub: Server;

beforeAll(async () => {
  // Stub of chat-service's GET /conversations/:id participant check, just enough
  // to exercise saveUpload/assertCanRead without needing the real chat-service running.
  chatServiceStub = createServer((req, res) => {
    if (req.url?.includes(DENIED_CONVERSATION_ID)) {
      res.writeHead(403).end();
      return;
    }
    res.writeHead(200).end();
  });
  await new Promise<void>((resolve) => chatServiceStub.listen(4567, resolve));
});

afterAll(async () => {
  await new Promise<void>((resolve) => chatServiceStub.close(() => resolve()));
  await rm(env.MULTIMEDIA_UPLOAD_DIR, { recursive: true, force: true });
});

describe('Media e2e: upload -> download -> info', () => {
  it('uploads a file and retrieves it via download and info endpoints', async () => {
    const userId = randomUUID();

    const uploadRes = await request(app)
      .post('/media')
      .set('x-internal-token', env.INTERNAL_API_TOKEN)
      .set('x-user-id', userId)
      .set('x-conversation-id', ALLOWED_CONVERSATION_ID)
      .attach('file', Buffer.from('hello world'), { filename: 'hello.txt', contentType: 'text/plain' });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.data).toMatchObject({
      conversationId: ALLOWED_CONVERSATION_ID,
      ownerUserId: userId,
      originalFilename: 'hello.txt',
      size: 11,
    });
    const mediaId: string = uploadRes.body.data.id;

    const infoRes = await request(app)
      .get(`/media/${mediaId}/info`)
      .set('x-internal-token', env.INTERNAL_API_TOKEN)
      .set('x-user-id', userId);
    expect(infoRes.status).toBe(200);
    expect(infoRes.body.data).toMatchObject({ id: mediaId, originalFilename: 'hello.txt' });

    const downloadRes = await request(app)
      .get(`/media/${mediaId}`)
      .set('x-internal-token', env.INTERNAL_API_TOKEN)
      .set('x-user-id', userId);
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.text).toBe('hello world');
  });

  it('returns a 403 when the requester is not a conversation participant', async () => {
    const userId = randomUUID();

    const uploadRes = await request(app)
      .post('/media')
      .set('x-internal-token', env.INTERNAL_API_TOKEN)
      .set('x-user-id', userId)
      .set('x-conversation-id', DENIED_CONVERSATION_ID)
      .attach('file', Buffer.from('secret'), { filename: 'secret.txt', contentType: 'text/plain' });

    expect(uploadRes.status).toBe(403);
  });

  it('returns a 404 for a non-existent media id', async () => {
    const res = await request(app)
      .get(`/media/${randomUUID()}/info`)
      .set('x-internal-token', env.INTERNAL_API_TOKEN)
      .set('x-user-id', randomUUID());
    expect(res.status).toBe(404);
  });

  it('rejects unauthenticated requests with a 401', async () => {
    const res = await request(app).get(`/media/${randomUUID()}/info`);
    expect(res.status).toBe(401);
  });
});
