import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { ERROR_CODES } from '../common/constants/error-codes.js';
import { ReviewError } from '../common/errors/review-error.js';
import { DEFAULT_OLLAMA_MODEL, DEFAULT_OLLAMA_URL } from '../config/runtime-config.js';
import {
  getUserConfigPath,
  parseOllamaUrl,
  saveUserConfig,
  type UserConfig,
} from '../config/user-config.js';

type OllamaTagsResponse = {
  models?: Array<{ name?: unknown; model?: unknown }>;
};

export async function runSetup(existing: UserConfig = {}): Promise<UserConfig> {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new ReviewError(
      ERROR_CODES.CONFIG_REQUIRED,
      '대화형 터미널에서 codivew setup을 실행하거나 config set 명령을 사용하세요.',
    );
  }

  const prompt = createInterface({ input: stdin, output: stdout });
  stdout.write('\nCodivew 초기 설정\n\n');

  try {
    const { url, models } = await askForOllama(prompt, existing.ollamaUrl ?? DEFAULT_OLLAMA_URL);
    const model = await askForModel(prompt, models, existing.model ?? DEFAULT_OLLAMA_MODEL);
    const saved = await saveUserConfig({ ollamaUrl: url, model });
    stdout.write(`\n✓ 설정을 저장했습니다.\n  ${getUserConfigPath()}\n\n`);
    return saved;
  } finally {
    prompt.close();
  }
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
        `Ollama 연결 확인에 실패했습니다. (HTTP ${response.status})`,
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
      ? '연결 시간이 초과되었습니다.'
      : '연결할 수 없습니다.';
    throw new ReviewError(ERROR_CODES.OLLAMA_UNAVAILABLE, `Ollama에 ${reason}`, error);
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
    const answer = (await prompt.question(`Ollama URL (${suggestedUrl}): `)).trim();
    try {
      const url = parseOllamaUrl(answer || suggestedUrl);
      stdout.write('  Ollama 연결 확인 중...\n');
      const models = await listOllamaModels(url);
      if (models.length === 0) {
        stdout.write('  설치된 모델이 없습니다. 먼저 ollama pull <model>을 실행하세요.\n\n');
        suggestedUrl = url;
        continue;
      }
      stdout.write(`  ✓ 연결됨 · 모델 ${models.length}개\n\n`);
      return { url, models };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stdout.write(`  ✗ ${message}\n  URL을 다시 입력하세요.\n\n`);
    }
  }
}

async function askForModel(
  prompt: ReturnType<typeof createInterface>,
  models: string[],
  preferredModel: string,
): Promise<string> {
  stdout.write('사용할 모델:\n');
  models.forEach((model, index) => stdout.write(`  ${index + 1}. ${model}\n`));
  const preferredIndex = models.indexOf(preferredModel);
  const defaultSelection = preferredIndex === -1 ? 1 : preferredIndex + 1;

  while (true) {
    const answer = (await prompt.question(`선택 (${defaultSelection}): `)).trim();
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
    stdout.write('  번호 또는 모델명을 정확히 입력하세요.\n');
  }
}
