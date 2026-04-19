import 'dotenv/config';

import { createEnv, z } from '@chatapp/common';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MULTIMEDIA_SERVICE_PORT: z.coerce.number().int().min(0).max(65_535).default(4004),
  MULTIMEDIA_UPLOAD_DIR: z.string().default('./data/uploads'),
  INTERNAL_API_TOKEN: z.string().min(16),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(25 * 1024 * 1024),
  ALLOWED_MIME_TYPES: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    ),
});

type EnvType = z.infer<typeof envSchema>;

export const env: EnvType = createEnv(envSchema, {
  serviceName: 'multimedia-service',
});

export type Env = typeof env;
