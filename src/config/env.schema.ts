import { z } from 'zod';

const positiveInteger = z.coerce.number().int().positive();

export const envSchema = z.object({
  OLLAMA_BASE_URL: z.string().url().optional(),
  OLLAMA_MODEL: z.string().trim().min(1).optional(),
  OLLAMA_TIMEOUT_MS: positiveInteger.default(600_000),
  REVIEW_MAX_DIFF_CHARS: positiveInteger.default(120_000),
});

export type Environment = z.infer<typeof envSchema>;

export function validateEnvironment(config: Record<string, unknown>): Environment {
  return envSchema.parse(config);
}
