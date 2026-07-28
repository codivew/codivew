import { stdout } from 'node:process';
import { ERROR_CODES } from '../common/constants/error-codes.js';
import { ReviewError } from '../common/errors/review-error.js';
import {
  getUserConfigPath,
  loadUserConfig,
  parseOllamaUrl,
  saveUserConfig,
} from '../config/user-config.js';
import type { ConfigKey } from './arguments.js';

export async function showConfig(): Promise<void> {
  const configPath = getUserConfigPath();
  const config = await loadUserConfig(configPath);
  stdout.write(
    [
      'Codivew 설정',
      `  파일        ${configPath}`,
      `  Ollama URL  ${config?.ollamaUrl ?? '(미설정)'}`,
      `  Model       ${config?.model ?? '(미설정)'}`,
      '',
    ].join('\n'),
  );
}

export async function setConfig(key: ConfigKey, value: string): Promise<void> {
  const configPath = getUserConfigPath();
  const current = (await loadUserConfig(configPath)) ?? {};
  const next =
    key === 'ollama-url'
      ? { ...current, ollamaUrl: parseOllamaUrl(value) }
      : { ...current, model: requireModel(value) };
  await saveUserConfig(next, configPath);
  stdout.write(`✓ ${key} 설정을 저장했습니다.\n  ${configPath}\n`);
}

function requireModel(value: string): string {
  const model = value.trim();
  if (model.length === 0) {
    throw new ReviewError(ERROR_CODES.CONFIG_INVALID, '모델명은 비어 있을 수 없습니다.');
  }
  return model;
}
