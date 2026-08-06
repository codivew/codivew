import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import {
  authenticationHeaders,
  DEFAULT_API_URL,
  DEFAULT_MODEL,
  ERROR_CODES,
  ReviewError,
  type Authentication,
} from '../core/index.js';
import { parseLanguage, setLanguage, t, type Language } from '../config/language.js';
import {
  getUserConfigPath,
  parseApiUrl,
  saveUserConfig,
  type UserConfig,
} from '../config/user-config.js';
import { outputStyle as style } from './terminal-style.js';

type ModelsResponse = { data?: Array<{ id?: unknown }> };
type SetupPrompt = ReturnType<typeof createInterface>;

class SecretOutput extends Writable {
  muted = false;

  override _write(
    chunk: string | Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    if (!this.muted) stdout.write(chunk, encoding);
    callback();
  }
}

export async function runSetup(existing: UserConfig = {}): Promise<UserConfig> {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new ReviewError(ERROR_CODES.CONFIG_REQUIRED, t('setup.ttyRequired'));
  }

  const secretOutput = new SecretOutput();
  const prompt = createInterface({ input: stdin, output: secretOutput, terminal: true });

  try {
    const language = await askForLanguage(prompt, existing.language ?? 'ko-KR');
    setLanguage(language);
    stdout.write(`\n${style.bold(style.cyan(t('setup.title')))}\n\n`);
    const authentication = await askForAuthentication(
      prompt,
      secretOutput,
      existing.authentication ?? { type: 'none' },
    );
    const { url, models } = await askForApi(
      prompt,
      existing.apiUrl ?? DEFAULT_API_URL,
      authentication,
    );
    const model = await askForModel(prompt, models, existing.model ?? DEFAULT_MODEL);
    const saved = await saveUserConfig({ apiUrl: url, model, language, authentication });
    stdout.write(
      `\n${style.green('✓')} ${style.bold(t('setup.saved'))}\n${style.gray(`  ${getUserConfigPath()}`)}\n\n`,
    );
    return saved;
  } finally {
    prompt.close();
  }
}

async function askForLanguage(prompt: SetupPrompt, currentLanguage: Language): Promise<Language> {
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

export function parseAuthenticationSelection(
  answer: string,
  current: Authentication['type'],
): Authentication['type'] | undefined {
  const selected = answer.trim().toLowerCase();
  if (selected.length === 0) return current;
  if (selected === '1' || selected === 'none') return 'none';
  if (selected === '2' || selected === 'api-key' || selected === 'apikey') return 'api-key';
  if (selected === '3' || selected === 'basic') return 'basic';
  return undefined;
}

export async function listModels(
  baseUrl: string,
  authentication: Authentication = { type: 'none' },
  timeoutMs = 10_000,
): Promise<string[]> {
  const normalizedUrl = parseApiUrl(baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${normalizedUrl}/models`, {
      headers: authenticationHeaders(authentication),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new ReviewError(
        ERROR_CODES.AI_PROVIDER_UNAVAILABLE,
        t('setup.apiCheckFailed', { status: response.status }),
      );
    }
    const body = (await response.json()) as ModelsResponse;
    return [
      ...new Set(
        (body.data ?? [])
          .map((model) => (typeof model.id === 'string' ? model.id : undefined))
          .filter((model): model is string => model !== undefined && model.length > 0),
      ),
    ];
  } catch (error) {
    if (error instanceof ReviewError) throw error;
    const reason = controller.signal.aborted
      ? t('setup.connectionTimeout')
      : t('setup.connectionFailed');
    throw new ReviewError(
      ERROR_CODES.AI_PROVIDER_UNAVAILABLE,
      t('setup.apiError', { reason }),
      error,
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function askForAuthentication(
  prompt: SetupPrompt,
  secretOutput: SecretOutput,
  current: Authentication,
): Promise<Authentication> {
  stdout.write(`${style.bold(t('setup.authentication'))}\n${t('setup.authenticationMenu')}\n`);
  const defaultSelection = { none: '1', 'api-key': '2', basic: '3' }[current.type];
  let type: Authentication['type'] | undefined;
  while (type === undefined) {
    const answer = await prompt.question(
      `${style.bold(t('setup.select'))} ${style.dim(`(${defaultSelection})`)}${style.cyan(':')} `,
    );
    type = parseAuthenticationSelection(answer, current.type);
    if (type === undefined) stdout.write(`  ${style.yellow('!')} ${t('setup.authInvalid')}\n`);
  }
  if (type === 'none') return { type };
  if (type === 'api-key') {
    const apiKey = await askSecret(
      prompt,
      secretOutput,
      t('setup.apiKey'),
      current.type === 'api-key' ? current.apiKey : undefined,
    );
    return { type, apiKey };
  }
  const currentUsername = current.type === 'basic' ? current.username : undefined;
  const username = await askRequired(prompt, t('setup.basicUsername'), currentUsername);
  const password = await askSecret(
    prompt,
    secretOutput,
    t('setup.basicPassword'),
    current.type === 'basic' ? current.password : undefined,
  );
  return { type, username, password };
}

async function askSecret(
  prompt: SetupPrompt,
  output: SecretOutput,
  label: string,
  existing?: string,
): Promise<string> {
  while (true) {
    const suffix = existing === undefined ? '' : ` ${style.dim(t('setup.keepExisting'))}`;
    const answerPromise = prompt.question(`${style.bold(label)}${suffix}${style.cyan(':')} `);
    output.muted = true;
    let answer: string;
    try {
      answer = (await answerPromise).trim();
    } finally {
      output.muted = false;
    }
    stdout.write('\n');
    if (answer.length > 0) return answer;
    if (existing !== undefined) return existing;
    stdout.write(`  ${style.yellow('!')} ${t('setup.valueRequired')}\n`);
  }
}

async function askRequired(prompt: SetupPrompt, label: string, existing?: string): Promise<string> {
  while (true) {
    const answer = (
      await prompt.question(
        `${style.bold(label)}${existing === undefined ? '' : style.dim(` (${existing})`)}${style.cyan(':')} `,
      )
    ).trim();
    if (answer.length > 0) return answer;
    if (existing !== undefined) return existing;
    stdout.write(`  ${style.yellow('!')} ${t('setup.valueRequired')}\n`);
  }
}

async function askForApi(
  prompt: SetupPrompt,
  defaultUrl: string,
  authentication: Authentication,
): Promise<{ url: string; models: string[] }> {
  let suggestedUrl = defaultUrl;
  while (true) {
    const answer = (
      await prompt.question(
        `${style.bold(t('setup.apiUrl'))} ${style.dim(`(${suggestedUrl})`)}${style.cyan(':')} `,
      )
    ).trim();
    try {
      const url = parseApiUrl(answer || suggestedUrl);
      stdout.write(`  ${style.cyan('●')} ${t('setup.checkingApi')}\n`);
      const models = await listModels(url, authentication);
      if (models.length === 0) {
        stdout.write(`  ${style.yellow('!')} ${t('setup.noModels')}\n\n`);
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
  prompt: SetupPrompt,
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
