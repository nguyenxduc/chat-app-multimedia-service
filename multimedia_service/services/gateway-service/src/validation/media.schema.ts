import { z } from '@chatapp/common';

export const mediaIdParamsSchema = z.object({
  id: z.string().uuid(),
});
