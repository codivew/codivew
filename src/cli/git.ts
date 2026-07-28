import { execFile } from 'node:child_process';
import { basename } from 'node:path';
import { ERROR_CODES } from '../common/constants/error-codes.js';
import { ReviewError } from '../common/errors/review-error.js';
import { ReviewMode } from '../reviews/types/review-request.js';
import type { CliOptions } from './arguments.js';

export type GitReviewInput = {
  repositoryRoot: string;
  repository: string;
  commitSha: string;
  diff: string;
};

export async function createGitReviewInput(
  cwd: string,
  options: CliOptions,
): Promise<GitReviewInput> {
  const repositoryRoot = await git(cwd, ['rev-parse', '--show-toplevel']);
  const commitSha = await git(repositoryRoot, ['rev-parse', 'HEAD']);
  const diffArguments = ['diff'];

  if (options.mode === ReviewMode.STAGED) diffArguments.push('--cached');
  if (options.mode === ReviewMode.BRANCH) diffArguments.push(`${options.baseBranch}...HEAD`);
  diffArguments.push('--unified=5', '--diff-filter=ACMRT');

  const diff = await git(repositoryRoot, diffArguments, false);
  if (diff.trim().length === 0) {
    throw new ReviewError(
      ERROR_CODES.EMPTY_DIFF,
      `리뷰할 변경사항이 없습니다. (mode: ${options.mode})`,
    );
  }

  return {
    repositoryRoot,
    repository: basename(repositoryRoot),
    commitSha,
    diff,
  };
}

function git(cwd: string, args: string[], trim = true): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'git',
      args,
      { cwd, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error !== null) {
          reject(
            new ReviewError(
              ERROR_CODES.GIT_FAILED,
              stderr.trim() || error.message || 'Git 명령 실행에 실패했습니다.',
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
