#!/usr/bin/env node

import { ZodError } from 'zod';
import { createRequire } from 'node:module';
import { parseArguments, type CliOptions } from './cli/arguments.js';
import { setConfig, showConfig } from './cli/config-command.js';
import { openReport, writeReports } from './cli/report.js';
import { runSetup } from './cli/setup.js';
import { scheduleUpdateNotification } from './cli/update-notification.js';
import { errorStyle, outputStyle as style } from './cli/terminal-style.js';
import { loadUserConfig, type UserConfig } from './config/user-config.js';
import {
  createGitReviewInput,
  DiffFilterService,
  ERROR_CODES,
  hasConfiguredRuntimeConfig,
  HtmlRendererService,
  OllamaService,
  resolveRuntimeConfig,
  ReviewError,
  ReviewMode,
  ReviewPromptService,
  ReviewsService,
  type ReviewRequest,
} from './core/index.js';

const loadModule = createRequire(import.meta.url);
const { name, version } = loadModule('../package.json') as { name: string; version: string };

async function main(): Promise<void> {
  await scheduleUpdateNotification({ name, version });
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

  const userConfig = await ensureUserConfig(command.options);
  const runtime = resolveRuntimeConfig(command.options, userConfig);
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

  printInput(request, runtime.ollamaUrl, runtime.model, command.options.format);
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

  const outputPaths = await writeReports(generated, command.options.format, command.options.output);
  const openedHtml = command.options.openReport ? outputPaths.html : undefined;
  if (openedHtml !== undefined) await openReport(openedHtml);

  process.stdout.write(
    [
      '',
      `${style.green('✓')} ${style.bold('리뷰 생성 완료')}`,
      `${style.gray('  판정          ')}${verdictLabel(generated.verdict)}`,
      `${style.gray('  검토 파일     ')}${style.cyan(`${generated.reviewedFileCount}개`)}`,
      `${style.gray('  리뷰 항목     ')}${style.yellow(`${generated.issueCount}개`)}`,
      `${style.gray('  처리 시간     ')}${style.blue(`${(generated.elapsedMs / 1000).toFixed(1)}초`)}`,
      ...(outputPaths.html === undefined
        ? []
        : [`${style.gray('  HTML          ')}${style.cyan(outputPaths.html)}`]),
      ...(outputPaths.json === undefined
        ? []
        : [`${style.gray('  JSON          ')}${style.cyan(outputPaths.json)}`]),
      openedHtml === undefined ? '' : style.dim('  브라우저에서 HTML 리포트를 열었습니다.'),
      '',
    ]
      .filter((line, index, lines) => line.length > 0 || index === 0 || index === lines.length - 1)
      .join('\n'),
  );
}

async function ensureUserConfig(
  options: Parameters<typeof hasConfiguredRuntimeConfig>[0],
): Promise<UserConfig | undefined> {
  const config = await loadUserConfig();
  if (config?.ollamaUrl !== undefined && config.model !== undefined) return config;
  if (hasConfiguredRuntimeConfig(options, config)) return config;
  if (process.stdin.isTTY && process.stdout.isTTY) return runSetup(config ?? {});
  throw new ReviewError(
    ERROR_CODES.CONFIG_REQUIRED,
    'Codivew 설정이 필요합니다. codivew setup 또는 codivew config set 명령을 실행하세요.',
  );
}

function printInput(
  request: ReviewRequest,
  baseUrl: string,
  model: string,
  format: CliOptions['format'],
): void {
  const changedFiles = (request.diff.match(/^diff --git /gm) ?? []).length;
  process.stdout.write(
    [
      '',
      style.bold(style.cyan('Codivew')),
      style.gray('────────────────────────────────────────'),
      `${style.gray('  Repository    ')}${style.bold(request.repository)}`,
      `${style.gray('  Mode          ')}${style.yellow(request.mode)}`,
      ...(request.baseBranch === undefined
        ? []
        : [`${style.gray('  Base branch   ')}${style.yellow(request.baseBranch)}`]),
      `${style.gray('  Changed files ')}${style.cyan(`${changedFiles}`)}`,
      `${style.gray('  Diff size     ')}${style.blue(`${Buffer.byteLength(request.diff, 'utf8')} bytes`)}`,
      `${style.gray('  Ollama        ')}${style.blue(baseUrl)}`,
      `${style.gray('  Model         ')}${style.magenta(model)}`,
      `${style.gray('  Output        ')}${style.green(outputFormatLabel(format))}`,
      style.gray('────────────────────────────────────────'),
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
      `\r\u001B[2K  ${style.cyan(frames[frame])} ${style.bold('Codivew Engine')} 리뷰 생성 중... ${style.dim(`${elapsed}s`)}`,
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

function outputFormatLabel(format: CliOptions['format']): string {
  return { html: 'HTML', json: 'JSON', both: 'HTML + JSON' }[format];
}

function verdictLabel(verdict: string): string {
  const labels: Record<string, string> = {
    approve: style.green('승인'),
    comment: style.yellow('확인 필요'),
    request_changes: style.red('수정 필요'),
  };
  return labels[verdict] ?? verdict;
}

function usage(): string {
  return `${style.bold('Usage:')} ${style.cyan('codivew')} ${style.yellow('[working|staged|branch]')} ${style.dim('[options]')}

Codivew Engine으로 로컬 Git diff를 리뷰하고 HTML 또는 JSON 리포트를 생성합니다.

${style.bold(style.cyan('Commands:'))}
  setup                 Ollama 연결과 모델을 대화형으로 설정
  config show           저장된 사용자 설정 표시
  config set <key> <v>  ollama-url 또는 model 설정

${style.bold(style.cyan('Modes:'))}
  working               작업 트리 변경사항 리뷰 (기본값)
  staged                스테이징된 변경사항 리뷰
  branch                기준 브랜치와 HEAD 사이 변경사항 리뷰

${style.bold(style.cyan('Options:'))}
  -b, --base <branch>    branch 모드 기준 브랜치 (기본값: main)
  -c, --context <text>   프로젝트 설명 추가, 여러 번 사용 가능
  -o, --output <path>    결과 파일의 기본 경로
      --format <format>  html, json, both 중 선택 (기본값: html)
      --no-open          브라우저를 열지 않기
      --no-update-notifier 업데이트 알림을 이번 실행에서 끄기
      --ollama-url <url> 이번 실행에서 사용할 Ollama URL
      --model <name>     이번 실행에서 사용할 모델
  -h, --help             도움말 표시
  -v, --version          버전 표시

`;
}

void main().catch((error: unknown) => {
  if (error instanceof ReviewError) {
    process.stderr.write(
      `${errorStyle.red('✗')} ${errorStyle.yellow(`[${error.code}]`)} ${errorStyle.red(error.message)}\n`,
    );
  } else if (error instanceof ZodError) {
    process.stderr.write(
      `${errorStyle.red('✗ 설정값이 올바르지 않습니다:')} ${error.issues[0]?.message ?? '검증 실패'}\n`,
    );
  } else {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${errorStyle.red('✗ 예상하지 못한 오류가 발생했습니다:')} ${message}\n`);
  }
  process.exitCode = 1;
});
