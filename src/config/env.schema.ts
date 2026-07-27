import { z } from 'zod';

const positiveInteger = z.coerce.number().int().positive();

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    REVIEW_API_TOKEN: z.string().default(''),
    PUBLIC_URL: z.string().url().default('http://localhost:3000/api/reviews'),
    OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
    OLLAMA_MODEL: z.string().trim().min(1).default('qwen3.6:35b-a3b-coding-mxfp8'),
    OLLAMA_TIMEOUT_MS: positiveInteger.default(180_000),
    REVIEW_MAX_DIFF_CHARS: positiveInteger.default(120_000),
    REVIEW_RESULT_TTL_MS: positiveInteger.default(86_400_000),
    REVIEW_BODY_LIMIT_BYTES: positiveInteger.default(524_288),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV === 'production' && env.REVIEW_API_TOKEN.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['REVIEW_API_TOKEN'],
        message: 'REVIEW_API_TOKEN is required in production',
      });
    }
  });

export type Environment = z.infer<typeof envSchema>;

export function validateEnvironment(config: Record<string, unknown>): Environment {
  return envSchema.parse(config);
}
