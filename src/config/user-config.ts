import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { ERROR_CODES, ReviewError } from '../core/index.js';
import { SUPPORTED_LANGUAGES, t } from './language.js';

const httpUrl = z
  .string()
  .url()
  .refine(
    (value) => ['http:', 'https:'].includes(new URL(value).protocol),
    () => ({
      message: t('config.urlInvalid'),
    }),
  )
  .transform((value) => value.replace(/\/$/, ''));

export const userConfigSchema = z
  .object({
    ollamaUrl: httpUrl.optional(),
    model: z.string().trim().min(1).optional(),
    language: z.enum(SUPPORTED_LANGUAGES).optional(),
  })
  .strict();

export type UserConfig = z.infer<typeof userConfigSchema>;

export function getUserConfigPath(
  platform = process.platform,
  environment: NodeJS.ProcessEnv = process.env,
  home = homedir(),
): string {
  if (platform === 'darwin')
    return join(home, 'Library', 'Application Support', 'Codivew', 'config.json');
  if (platform === 'win32') {
    return join(environment.APPDATA ?? join(home, 'AppData', 'Roaming'), 'Codivew', 'config.json');
  }
  return join(environment.XDG_CONFIG_HOME ?? join(home, '.config'), 'codivew', 'config.json');
}

export async function loadUserConfig(
  configPath = getUserConfigPath(),
): Promise<UserConfig | undefined> {
  let contents: string;
  try {
    contents = await readFile(configPath, 'utf8');
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return undefined;
    throw new ReviewError(
      ERROR_CODES.CONFIG_INVALID,
      t('config.readFailed', { path: configPath }),
      error,
    );
  }

  try {
    return userConfigSchema.parse(JSON.parse(contents) as unknown);
  } catch (error) {
    throw new ReviewError(
      ERROR_CODES.CONFIG_INVALID,
      t('config.invalid', { path: configPath }),
      error,
    );
  }
}

export async function saveUserConfig(
  config: UserConfig,
  configPath = getUserConfigPath(),
): Promise<UserConfig> {
  const validated = userConfigSchema.parse(config);
  const temporaryPath = `${configPath}.${process.pid}.tmp`;
  try {
    await mkdir(dirname(configPath), { recursive: true, mode: 0o700 });
    await writeFile(temporaryPath, `${JSON.stringify(validated, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    await rename(temporaryPath, configPath);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) throw error;
    throw new ReviewError(
      ERROR_CODES.CONFIG_INVALID,
      t('config.saveFailed', { path: configPath }),
      error,
    );
  }
}

export function parseOllamaUrl(value: string): string {
  return httpUrl.parse(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error;
}
