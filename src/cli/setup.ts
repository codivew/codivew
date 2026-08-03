import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { ERROR_CODES } from '../common/constants/error-codes.js';
import { ReviewError } from '../common/errors/review-error.js';
import { parseLanguage, setLanguage, t, type Language } from '../config/language.js';
import { DEFAULT_OLLAMA_MODEL, DEFAULT_OLLAMA_URL } from '../config/runtime-config.js';
import {
  getUserConfigPath,
  parseOllamaUrl,
  saveUserConfig,
  type UserConfig,
} from '../config/user-config.js';
import { outputStyle as style } from './terminal-style.js';

type OllamaTagsResponse = {
  models?: Array<{ name?: unknown; model?: unknown }>;
};

export async function runSetup(existing: UserConfig = {}): Promise<UserConfig> {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new ReviewError(ERROR_CODES.CONFIG_REQUIRED, t('setup.ttyRequired'));
  }

  const prompt = createInterface({ input: stdin, output: stdout });

  try {
    const language = await askForLanguage(prompt, existing.language ?? 'ko-KR');
    setLanguage(language);
    stdout.write(`\n${style.bold(style.cyan(t('setup.title')))}\n\n`);
    const { url, models } = await askForOllama(prompt, existing.ollamaUrl ?? DEFAULT_OLLAMA_URL);
    const model = await askForModel(prompt, models, existing.model ?? DEFAULT_OLLAMA_MODEL);
    const saved = await saveUserConfig({ ollamaUrl: url, model, language });
    stdout.write(
      `\n${style.green('✓')} ${style.bold(t('setup.saved'))}\n${style.gray(`  ${getUserConfigPath()}`)}\n\n`,
    );
    return saved;
  } finally {
    prompt.close();
  }
}

async function askForLanguage(
  prompt: ReturnType<typeof createInterface>,
  currentLanguage: Language,
): Promise<Language> {
  stdout.write(`\n${style.bold(t('setup.languageMenu'))}\n`);
  const defaultSelection = currentLanguage === 'en' ? '2' : '1';
  while (true) {
    const answer = (
      await prompt.question(t('setup.languageQuestion', { selection: defaultSelection }))
    ).trim();
    const language = parseLanguageSelection(answer, currentLanguage);
    if (language !== undefined) return language;
    stdout.write(`  ${style.yellow('!')} ${t('setup.languageInvalid')}\n`);
  }
}

export function parseLanguageSelection(
  answer: string,
  defaultLanguage: Language,
): Language | undefined {
  const selected = answer.trim();
  if (selected.length === 0) return defaultLanguage;
  if (selected === '1') return 'ko-KR';
  if (selected === '2') return 'en';
  return parseLanguage(selected);
}

export async function listOllamaModels(baseUrl: string, timeoutMs = 10_000): Promise<string[]> {
  const normalizedUrl = parseOllamaUrl(baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${normalizedUrl}/api/tags`, { signal: controller.signal });
    if (!response.ok) {
      throw new ReviewError(
        ERROR_CODES.OLLAMA_UNAVAILABLE,
        t('setup.ollamaCheckFailed', { status: response.status }),
      );
    }
    const body = (await response.json()) as OllamaTagsResponse;
    const models = (body.models ?? [])
      .map((model) =>
        typeof model.name === 'string'
          ? model.name
          : typeof model.model === 'string'
            ? model.model
            : undefined,
      )
      .filter((model): model is string => model !== undefined && model.length > 0);
    return [...new Set(models)];
  } catch (error) {
    if (error instanceof ReviewError) throw error;
    const reason = controller.signal.aborted
      ? t('setup.connectionTimeout')
      : t('setup.connectionFailed');
    throw new ReviewError(
      ERROR_CODES.OLLAMA_UNAVAILABLE,
      t('setup.ollamaError', { reason }),
      error,
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function askForOllama(
  prompt: ReturnType<typeof createInterface>,
  defaultUrl: string,
): Promise<{ url: string; models: string[] }> {
  let suggestedUrl = defaultUrl;
  while (true) {
    const answer = (
      await prompt.question(
        `${style.bold('Ollama URL')} ${style.dim(`(${suggestedUrl})`)}${style.cyan(':')} `,
      )
    ).trim();
    try {
      const url = parseOllamaUrl(answer || suggestedUrl);
      stdout.write(`  ${style.cyan('●')} ${t('setup.checkingOllama')}\n`);
      const models = await listOllamaModels(url);
      if (models.length === 0) {
        stdout.write(
          `  ${style.yellow('!')} ${t('setup.noModels', {
            command: style.cyan('ollama pull <model>'),
          })}\n\n`,
        );
        suggestedUrl = url;
        continue;
      }
      stdout.write(
        `  ${style.green('✓')} ${t('setup.connected')} ${style.gray('·')} ${t('setup.modelCount', {
          count: style.bold(`${models.length}`),
        })}\n\n`,
      );
      return { url, models };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stdout.write(
        `  ${style.red('✗')} ${style.red(message)}\n  ${style.yellow(t('setup.retryUrl'))}\n\n`,
      );
    }
  }
}

async function askForModel(
  prompt: ReturnType<typeof createInterface>,
  models: string[],
  preferredModel: string,
): Promise<string> {
  stdout.write(`${style.bold(t('setup.modelToUse'))}\n`);
  models.forEach((model, index) =>
    stdout.write(`  ${style.cyan(`${index + 1}.`)} ${style.magenta(model)}\n`),
  );
  const preferredIndex = models.indexOf(preferredModel);
  const defaultSelection = preferredIndex === -1 ? 1 : preferredIndex + 1;

  while (true) {
    const answer = (
      await prompt.question(
        `${style.bold(t('setup.select'))} ${style.dim(`(${defaultSelection})`)}${style.cyan(':')} `,
      )
    ).trim();
    if (answer.length === 0) return models[defaultSelection - 1];
    const numericSelection = Number(answer);
    if (
      Number.isInteger(numericSelection) &&
      numericSelection >= 1 &&
      numericSelection <= models.length
    ) {
      return models[numericSelection - 1];
    }
    if (models.includes(answer)) return answer;
    stdout.write(`  ${style.yellow('!')} ${t('setup.invalidModel')}\n`);
  }
}
