import { stdout } from 'node:process';
import { ERROR_CODES, ReviewError } from '../core/index.js';
import { parseLanguage, setLanguage, t, type Language } from '../config/language.js';
import {
  getUserConfigPath,
  loadUserConfig,
  parseApiUrl,
  saveUserConfig,
  type UserConfig,
} from '../config/user-config.js';
import type { ConfigKey } from './arguments.js';
import { outputStyle as style } from './terminal-style.js';

export async function showConfig(): Promise<void> {
  const configPath = getUserConfigPath();
  const config = await loadUserConfig(configPath);
  stdout.write(
    [
      style.bold(style.cyan(t('config.title'))),
      `${style.gray(t('config.fileLabel'))}${configPath}`,
      `${style.gray('  API URL     ')}${style.blue(config?.apiUrl ?? t('common.notSet'))}`,
      `${style.gray('  Model       ')}${style.magenta(config?.model ?? t('common.notSet'))}`,
      `${style.gray('  Auth        ')}${style.cyan(authenticationLabel(config?.authentication))}`,
      `${style.gray('  Language    ')}${style.cyan(config?.language ?? 'ko-KR')}`,
      '',
    ].join('\n'),
  );
}

export async function setConfig(key: ConfigKey, value: string): Promise<void> {
  const configPath = getUserConfigPath();
  const current = (await loadUserConfig(configPath)) ?? {};
  const next =
    key === 'api-url' || key === 'ollama-url'
      ? { ...current, apiUrl: parseApiUrl(key === 'ollama-url' ? legacyApiUrl(value) : value) }
      : key === 'model'
        ? { ...current, model: requireModel(value) }
        : { ...current, language: requireLanguage(value) };
  await saveUserConfig(next, configPath);
  if (next.language !== undefined) setLanguage(next.language);
  stdout.write(
    `${style.green('✓')} ${style.bold(
      t('config.saved', { key }),
    )}\n${style.gray(`  ${configPath}`)}\n`,
  );
}

function authenticationLabel(authentication: UserConfig['authentication']): string {
  if (authentication?.type === 'api-key') return 'API Key (configured)';
  if (authentication?.type === 'basic') return `Basic (${authentication.username})`;
  return 'None';
}

function legacyApiUrl(value: string): string {
  const normalized = value.replace(/\/+$/, '');
  return normalized.endsWith('/v1') ? normalized : `${normalized}/v1`;
}

function requireModel(value: string): string {
  const model = value.trim();
  if (model.length === 0) {
    throw new ReviewError(ERROR_CODES.CONFIG_INVALID, t('config.modelRequired'));
  }
  return model;
}

function requireLanguage(value: string): Language {
  const language = parseLanguage(value.trim());
  if (language === undefined) {
    throw new ReviewError(ERROR_CODES.CONFIG_INVALID, t('config.languageInvalid'));
  }
  return language;
}
