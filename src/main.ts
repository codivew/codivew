#!/usr/bin/env node

import { ZodError } from 'zod';
import { createRequire } from 'node:module';
import { parseArguments, type CliOptions } from './cli/arguments.js';
import { setConfig, showConfig } from './cli/config-command.js';
import { createGitReviewInput } from './cli/git.js';
import { openReport, writeReports } from './cli/report.js';
import { runSetup } from './cli/setup.js';
import { scheduleUpdateNotification } from './cli/update-notification.js';
import { errorStyle, outputStyle as style } from './cli/terminal-style.js';
import { ERROR_CODES } from './common/constants/error-codes.js';
import { ReviewError } from './common/errors/review-error.js';
import { setLanguage, t } from './config/language.js';
import { hasConfiguredRuntimeConfig, resolveRuntimeConfig } from './config/runtime-config.js';
import { loadUserConfig, type UserConfig } from './config/user-config.js';
import { HtmlRendererService } from './reporting/html-renderer.service.js';
import { DiffFilterService } from './reviews/diff-filter.service.js';
import { OllamaService } from './reviews/ollama.service.js';
import { ReviewPromptService } from './reviews/review-prompt.service.js';
import { ReviewsService } from './reviews/reviews.service.js';
import { ReviewMode, type ReviewRequest } from './reviews/types/review-request.js';

const loadModule = createRequire(import.meta.url);
const { name, version } = loadModule('../package.json') as { name: string; version: string };

async function main(): Promise<void> {
  const savedConfig = await loadUserConfig();
  setLanguage(savedConfig?.language ?? 'ko-KR');
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
    await runSetup(savedConfig ?? {});
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

  const userConfig = await ensureUserConfig(command.options, savedConfig);
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
      `${style.green('✓')} ${style.bold(t('cli.reviewComplete'))}`,
      `${style.gray(t('cli.verdictLabel'))}${verdictLabel(generated.verdict)}`,
      `${style.gray(t('cli.filesLabel'))}${style.cyan(
        t('cli.count', { count: generated.reviewedFileCount }),
      )}`,
      `${style.gray(t('cli.itemsLabel'))}${style.yellow(
        t('cli.count', { count: generated.issueCount }),
      )}`,
      `${style.gray(t('cli.elapsedLabel'))}${style.blue(
        t('common.seconds', { value: (generated.elapsedMs / 1000).toFixed(1) }),
      )}`,
      ...(outputPaths.html === undefined
        ? []
        : [`${style.gray('  HTML          ')}${style.cyan(outputPaths.html)}`]),
      ...(outputPaths.json === undefined
        ? []
        : [`${style.gray('  JSON          ')}${style.cyan(outputPaths.json)}`]),
      openedHtml === undefined ? '' : style.dim(t('cli.openedHtml')),
      '',
    ]
      .filter((line, index, lines) => line.length > 0 || index === 0 || index === lines.length - 1)
      .join('\n'),
  );
}

async function ensureUserConfig(
  options: Parameters<typeof hasConfiguredRuntimeConfig>[0],
  config: UserConfig | undefined,
): Promise<UserConfig | undefined> {
  if (config?.ollamaUrl !== undefined && config.model !== undefined) return config;
  if (hasConfiguredRuntimeConfig(options, config)) return config;
  if (process.stdin.isTTY && process.stdout.isTTY) return runSetup(config ?? {});
  throw new ReviewError(ERROR_CODES.CONFIG_REQUIRED, t('cli.configRequired'));
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
    process.stdout.write(`${t('cli.reviewing')}\n`);
    return () => undefined;
  }

  const frames = ['|', '/', '-', '\\'];
  let frame = 0;
  const render = (): void => {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    process.stdout.write(
      `\r\u001B[2K  ${style.cyan(frames[frame])} ${style.bold('Codivew Engine')} ${t(
        'cli.reviewingShort',
      )} ${style.dim(`${elapsed}s`)}`,
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
    approve: style.green(t('cli.verdict.approve')),
    comment: style.yellow(t('cli.verdict.comment')),
    request_changes: style.red(t('cli.verdict.requestChanges')),
  };
  return labels[verdict] ?? verdict;
}

function usage(): string {
  return t('cli.help', {
    usageLabel: style.bold('Usage:'),
    command: style.cyan('codivew'),
    modeSpec: style.yellow('[working|staged|branch]'),
    optionSpec: style.dim('[options]'),
    commandsHeading: style.bold(style.cyan('Commands:')),
    modesHeading: style.bold(style.cyan('Modes:')),
    optionsHeading: style.bold(style.cyan('Options:')),
  });
}

void main().catch((error: unknown) => {
  if (error instanceof ReviewError) {
    process.stderr.write(
      `${errorStyle.red('✗')} ${errorStyle.yellow(`[${error.code}]`)} ${errorStyle.red(error.message)}\n`,
    );
  } else if (error instanceof ZodError) {
    process.stderr.write(
      `${errorStyle.red(t('cli.invalidConfig'))} ${
        error.issues[0]?.message ?? t('cli.validationFailed')
      }\n`,
    );
  } else {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${errorStyle.red(t('cli.unexpectedError'))} ${message}\n`);
  }
  process.exitCode = 1;
});
