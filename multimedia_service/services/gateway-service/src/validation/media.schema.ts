import { z } from '@chatapp/common';

export const mediaIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const conversationIdHeaderSchema = z.string().uuid();
