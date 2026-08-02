import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { ReviewMode } from '../reviews/types/review-request.js';
import type { CliOptions } from './arguments.js';
import { createGitReviewInput } from './git.js';

const execFileAsync = promisify(execFile);

describe('createGitReviewInput', () => {
  let repository: string;

  beforeEach(async () => {
    repository = await mkdtemp(join(tmpdir(), 'codivew-git-test-'));
    await git(['init', '--quiet']);
    await git(['config', 'user.email', 'codivew@example.com']);
    await git(['config', 'user.name', 'Codivew Test']);
    await writeFile(join(repository, '.gitignore'), 'ignored.ts\n');
    await writeFile(join(repository, 'tracked.ts'), 'export const value = 1;\n');
    await git(['add', '.gitignore', 'tracked.ts']);
    await git(['commit', '--quiet', '-m', 'initial']);
  });

  afterEach(async () => {
    await rm(repository, { recursive: true, force: true });
  });

  it('includes untracked files that are not ignored in working mode', async () => {
    await writeFile(join(repository, 'tracked.ts'), 'export const value = 2;\n');
    await writeFile(join(repository, 'new file.ts'), 'export const added = true;\n');
    await writeFile(join(repository, 'ignored.ts'), 'secret\n');

    const result = await createGitReviewInput(repository, options(ReviewMode.WORKING));

    expect(result.diff).toContain('diff --git a/tracked.ts b/tracked.ts');
    expect(result.diff).toContain('diff --git a/new file.ts b/new file.ts');
    expect(result.diff).toContain('+export const added = true;');
    expect(result.diff).not.toContain('ignored.ts');
  });

  it('does not include unstaged untracked files in staged mode', async () => {
    await writeFile(join(repository, 'staged.ts'), 'export const staged = true;\n');
    await git(['add', 'staged.ts']);
    await writeFile(join(repository, 'untracked.ts'), 'export const untracked = true;\n');

    const result = await createGitReviewInput(repository, options(ReviewMode.STAGED));

    expect(result.diff).toContain('diff --git a/staged.ts b/staged.ts');
    expect(result.diff).not.toContain('untracked.ts');
  });

  async function git(args: string[]): Promise<void> {
    await execFileAsync('git', args, { cwd: repository });
  }
});

function options(mode: ReviewMode): CliOptions {
  return {
    mode,
    baseBranch: 'main',
    openReport: false,
    projectContext: [],
  };
}
