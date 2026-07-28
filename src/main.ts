#!/usr/bin/env node

import { ZodError } from 'zod';
import { createRequire } from 'node:module';
import { parseArguments } from './cli/arguments.js';
import { setConfig, showConfig } from './cli/config-command.js';
import { createGitReviewInput } from './cli/git.js';
import { openReport, writeReport } from './cli/report.js';
import { runSetup } from './cli/setup.js';
import { ERROR_CODES } from './common/constants/error-codes.js';
import { ReviewError } from './common/errors/review-error.js';
import { validateEnvironment } from './config/env.schema.js';
import { hasConfiguredRuntimeConfig, resolveRuntimeConfig } from './config/runtime-config.js';
import { loadUserConfig, type UserConfig } from './config/user-config.js';
import { DiffFilterService } from './reviews/diff-filter.service.js';
import { HtmlRendererService } from './reviews/html-renderer.service.js';
import { OllamaService } from './reviews/ollama.service.js';
import { ReviewPromptService } from './reviews/review-prompt.service.js';
import { ReviewsService } from './reviews/reviews.service.js';
import { ReviewMode, type ReviewRequest } from './reviews/types/review-request.js';

const loadModule = createRequire(import.meta.url);
const { version } = loadModule('../package.json') as { version: string };

async function main(): Promise<void> {
  const command = parseArguments(process.argv.slice(2));
  if (command.kind === 'help') {
    process.stdout.write(usage());
    return;
  }
  if (command.kind === 'version') {
    process.stdout.write(`${version}\n`);
    return;
  }
  if (command.kind === 'setup') {
    await runSetup((await loadUserConfig()) ?? {});
    return;
  }
  if (command.kind === 'config-show') {
    await showConfig();
    return;
  }
  if (command.kind === 'config-set') {
    await setConfig(command.key, command.value);
    return;
  }

  const env = validateEnvironment(process.env);
  const userConfig = await ensureUserConfig(command.options, env);
  const runtime = resolveRuntimeConfig(command.options, env, userConfig);
  const gitInput = await createGitReviewInput(process.cwd(), command.options);
  const request: ReviewRequest = {
    repository: gitInput.repository,
    baseBranch: command.options.mode === ReviewMode.BRANCH ? command.options.baseBranch : undefined,
    mode: command.options.mode,
    commitSha: gitInput.commitSha,
    projectContext:
      command.options.projectContext.length === 0 ? undefined : command.options.projectContext,
    diff: gitInput.diff,
  };

  printInput(request, runtime.ollamaUrl, runtime.model);
  const stopProgress = startProgress();
  let generated: Awaited<ReturnType<ReviewsService['createReview']>>;
  try {
    const reviews = new ReviewsService(
      runtime.maxDiffChars,
      new DiffFilterService(),
      new ReviewPromptService(),
      new OllamaService({
        baseUrl: runtime.ollamaUrl,
        model: runtime.model,
        timeoutMs: runtime.timeoutMs,
      }),
      new HtmlRendererService(),
    );
    generated = await reviews.createReview(request);
  } finally {
    stopProgress();
  }

  const outputPath = await writeReport(
    generated.html,
    request.repository,
    generated.reviewId,
    command.options.output,
  );
  if (command.options.open) await openReport(outputPath);

  process.stdout.write(
    [
      '',
      '✓ 리뷰 생성 완료',
      `  판정          ${verdictLabel(generated.verdict)}`,
      `  검토 파일     ${generated.reviewedFileCount}개`,
      `  리뷰 항목     ${generated.issueCount}개`,
      `  처리 시간     ${(generated.elapsedMs / 1000).toFixed(1)}초`,
      `  결과 파일     ${outputPath}`,
      command.options.open ? '  브라우저에서 결과를 열었습니다.' : '',
      '',
    ]
      .filter((line, index, lines) => line.length > 0 || index === 0 || index === lines.length - 1)
      .join('\n'),
  );
}

async function ensureUserConfig(
  options: Parameters<typeof hasConfiguredRuntimeConfig>[0],
  environment: Parameters<typeof hasConfiguredRuntimeConfig>[1],
): Promise<UserConfig | undefined> {
  const config = await loadUserConfig();
  if (config?.ollamaUrl !== undefined && config.model !== undefined) return config;
  if (hasConfiguredRuntimeConfig(options, environment, config)) return config;
  if (process.stdin.isTTY && process.stdout.isTTY) return runSetup(config ?? {});
  throw new ReviewError(
    ERROR_CODES.CONFIG_REQUIRED,
    'Codivew 설정이 필요합니다. codivew setup 또는 codivew config set 명령을 실행하세요.',
  );
}

function printInput(request: ReviewRequest, baseUrl: string, model: string): void {
  const changedFiles = (request.diff.match(/^diff --git /gm) ?? []).length;
  process.stdout.write(
    [
      '',
      'Codivew',
      '────────────────────────────────────────',
      `  Repository    ${request.repository}`,
      `  Mode          ${request.mode}`,
      ...(request.baseBranch === undefined ? [] : [`  Base branch   ${request.baseBranch}`]),
      `  Changed files ${changedFiles}`,
      `  Diff size     ${Buffer.byteLength(request.diff, 'utf8')} bytes`,
      `  Ollama        ${baseUrl}`,
      `  Model         ${model}`,
      '────────────────────────────────────────',
      '',
    ].join('\n'),
  );
}

function startProgress(): () => void {
  const startedAt = Date.now();
  if (!process.stdout.isTTY) {
    process.stdout.write('Codivew Engine 리뷰 생성 중...\n');
    return () => undefined;
  }

  const frames = ['|', '/', '-', '\\'];
  let frame = 0;
  const render = (): void => {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    process.stdout.write(
      `\r\u001B[2K  ${frames[frame]} Codivew Engine 리뷰 생성 중... ${elapsed}s`,
    );
    frame = (frame + 1) % frames.length;
  };
  render();
  const timer = setInterval(render, 250);
  return () => {
    clearInterval(timer);
    process.stdout.write('\r\u001B[2K');
  };
}

function verdictLabel(verdict: string): string {
  return (
    { approve: '승인', comment: '확인 필요', request_changes: '수정 필요' }[verdict] ?? verdict
  );
}

function usage(): string {
  return `Usage: codivew [working|staged|branch] [options]

Codivew Engine으로 로컬 Git diff를 리뷰하고 독립 실행형 HTML 리포트를 생성합니다.

Commands:
  setup                 Ollama 연결과 모델을 대화형으로 설정
  config show           저장된 사용자 설정 표시
  config set <key> <v>  ollama-url 또는 model 설정

Modes:
  working               작업 트리 변경사항 리뷰 (기본값)
  staged                스테이징된 변경사항 리뷰
  branch                기준 브랜치와 HEAD 사이 변경사항 리뷰

Options:
  -b, --base <branch>    branch 모드 기준 브랜치 (기본값: main)
  -c, --context <text>   프로젝트 설명 추가, 여러 번 사용 가능
  -o, --output <path>    HTML 결과 파일 경로
      --open             완료 후 브라우저에서 열기
      --ollama-url <url> 이번 실행에서 사용할 Ollama URL
      --model <name>     이번 실행에서 사용할 모델
  -h, --help             도움말 표시
  -v, --version          버전 표시

Environment:
  OLLAMA_BASE_URL        Ollama 주소 (기본값: http://localhost:11434)
  OLLAMA_MODEL           리뷰 모델
  OLLAMA_TIMEOUT_MS      요청 제한 시간 (기본값: 600000)
  REVIEW_MAX_DIFF_CHARS  필터링 후 최대 Diff 문자 수 (기본값: 120000)
`;
}

void main().catch((error: unknown) => {
  if (error instanceof ReviewError) {
    process.stderr.write(`✗ [${error.code}] ${error.message}\n`);
  } else if (error instanceof ZodError) {
    process.stderr.write(
      `✗ 설정값이 올바르지 않습니다: ${error.issues[0]?.message ?? '검증 실패'}\n`,
    );
  } else {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`✗ 예상하지 못한 오류가 발생했습니다: ${message}\n`);
  }
  process.exitCode = 1;
});
