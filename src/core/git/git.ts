import { execFile } from 'node:child_process';
import { basename } from 'node:path';
import { ERROR_CODES } from '../common/constants/error-codes.js';
import { ReviewError } from '../common/errors/review-error.js';
import { t } from '../config/language.js';
import { ReviewMode } from '../reviews/types/review-request.js';

export type GitReviewOptions = {
  mode: ReviewMode;
  baseBranch: string;
  signal?: AbortSignal;
};

export type GitReviewInput = {
  repositoryRoot: string;
  repository: string;
  commitSha: string;
  diff: string;
};

export async function createGitReviewInput(
  cwd: string,
  options: GitReviewOptions,
): Promise<GitReviewInput> {
  const repositoryRoot = await git(
    cwd,
    ['rev-parse', '--show-toplevel'],
    true,
    [0],
    options.signal,
  );
  const commitSha = await git(repositoryRoot, ['rev-parse', 'HEAD'], true, [0], options.signal);
  const diffArguments = ['diff'];

  if (options.mode === ReviewMode.STAGED) diffArguments.push('--cached');
  if (options.mode === ReviewMode.BRANCH) diffArguments.push(`${options.baseBranch}...HEAD`);
  diffArguments.push('--unified=5', '--diff-filter=ACMRT');

  const trackedDiff = await git(repositoryRoot, diffArguments, false, [0], options.signal);
  const untrackedDiff =
    options.mode === ReviewMode.WORKING
      ? await createUntrackedDiff(repositoryRoot, options.signal)
      : '';
  const diff = [trackedDiff.trimEnd(), untrackedDiff.trimEnd()]
    .filter((part) => part.length > 0)
    .join('\n');
  if (diff.trim().length === 0) {
    throw new ReviewError(ERROR_CODES.EMPTY_DIFF, t('git.noChanges', { mode: options.mode }));
  }

  return {
    repositoryRoot,
    repository: basename(repositoryRoot),
    commitSha,
    diff,
  };
}

async function createUntrackedDiff(repositoryRoot: string, signal?: AbortSignal): Promise<string> {
  const output = await git(
    repositoryRoot,
    ['ls-files', '--others', '--exclude-standard', '-z'],
    false,
    [0],
    signal,
  );
  const paths = output.split('\0').filter((path) => path.length > 0);
  const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null';
  const diffs: string[] = [];

  for (const path of paths) {
    const diff = await git(
      repositoryRoot,
      ['diff', '--no-index', '--unified=5', '--', nullDevice, path],
      false,
      [0, 1],
      signal,
    );
    if (diff.trim().length > 0) diffs.push(diff.trimEnd());
  }

  return diffs.join('\n');
}

function git(
  cwd: string,
  args: string[],
  trim = true,
  acceptedExitCodes: readonly number[] = [0],
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'git',
      args,
      { cwd, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, signal },
      (error, stdout, stderr) => {
        if (signal?.aborted === true) {
          reject(new ReviewError(ERROR_CODES.CANCELLED, '리뷰가 취소되었습니다.', error));
          return;
        }
        const exitCode = typeof error?.code === 'number' ? error.code : undefined;
        if (error !== null && (exitCode === undefined || !acceptedExitCodes.includes(exitCode))) {
          reject(
            new ReviewError(
              ERROR_CODES.GIT_FAILED,
              stderr.trim() || error.message || t('git.commandFailed'),
              error,
            ),
          );
          return;
        }
        resolve(trim ? stdout.trim() : stdout);
      },
    );
  });
}
