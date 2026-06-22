import { describe, expect, it } from 'vitest';

import { conversationIdHeaderSchema, mediaIdParamsSchema } from '@/validation/media.schema';

describe('mediaIdParamsSchema', () => {
  it('accepts a valid UUID', () => {
    const result = mediaIdParamsSchema.safeParse({ id: '123e4567-e89b-12d3-a456-426614174000' });
    expect(result.success).toBe(true);
  });

  it('rejects a non-UUID string', () => {
    const result = mediaIdParamsSchema.safeParse({ id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});

describe('conversationIdHeaderSchema', () => {
  it('accepts a valid UUID string', () => {
    const result = conversationIdHeaderSchema.safeParse('123e4567-e89b-12d3-a456-426614174000');
    expect(result.success).toBe(true);
  });

  it('rejects a non-UUID string', () => {
    const result = conversationIdHeaderSchema.safeParse('not-a-uuid');
    expect(result.success).toBe(false);
  });
});
