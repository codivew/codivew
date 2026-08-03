import { execFile } from 'node:child_process';
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { jest } from '@jest/globals';
import { ReviewMode } from './reviews/types/review-request.js';
import { runReview } from './run-review.js';

const execFileAsync = promisify(execFile);

describe('runReview', () => {
  const originalFetch = global.fetch;
  let repository: string;

  beforeEach(async () => {
    repository = await mkdtemp(join(tmpdir(), 'codivew-core-test-'));
    await git(['init', '--quiet']);
    await git(['config', 'user.email', 'codivew@example.com']);
    await git(['config', 'user.name', 'Codivew Test']);
    await writeFile(join(repository, 'value.ts'), 'export const value = 1;\n');
    await git(['add', 'value.ts']);
    await git(['commit', '--quiet', '-m', 'initial']);
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    await rm(repository, { recursive: true, force: true });
  });

  it('composes Git collection, model review and report rendering', async () => {
    await writeFile(join(repository, 'value.ts'), 'export const value = 2;\n');
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          message: {
            content: JSON.stringify({
              verdict: 'comment',
              risk: 'low',
              summary: '변경값을 확인하세요.',
              issues: [
                {
                  severity: 'suggestion',
                  confidence: 0.9,
                  file: 'value.ts',
                  line: 1,
                  title: '값 변경 확인',
                  description: '의도한 값인지 확인하세요.',
                },
              ],
              tests: [],
            }),
          },
        }),
    } as Response);

    const result = await runReview({ cwd: repository, mode: ReviewMode.WORKING });

    expect(result.repositoryRoot).toBe(await realpath(repository));
    expect(result.issueCount).toBe(1);
    expect(result.json.result.issues[0]).toMatchObject({ file: 'value.ts', line: 1 });
    expect(result.html).toContain('값 변경 확인');
  });

  async function git(args: string[]): Promise<void> {
    await execFileAsync('git', args, { cwd: repository });
  }
});
