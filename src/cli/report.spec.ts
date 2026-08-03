import { jest } from '@jest/globals';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ReviewJsonReport } from '../reviews/reviews.service.js';
import { ReviewMode } from '../reviews/types/review-request.js';
import { writeReports } from './report.js';

const json: ReviewJsonReport = {
  schemaVersion: 1,
  reviewId: 'review-id',
  createdAt: '2026-07-28T05:05:09.000Z',
  elapsedMs: 100,
  model: 'qwen',
  request: { repository: 'repo', mode: ReviewMode.STAGED },
  files: { reviewed: ['src/app.ts'], originalCount: 1, excludedCount: 0 },
  result: { verdict: 'approve', risk: 'low', summary: '좋습니다.', issues: [], tests: [] },
};

describe('writeReports', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'codivew-report-test-'));
    jest.spyOn(process, 'cwd').mockReturnValue(directory);
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 28, 14, 5, 9));
  });

  afterEach(async () => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    await rm(directory, { recursive: true, force: true });
  });

  it('writes an HTML report by default format', async () => {
    const paths = await writeReports({ html: '<html>review</html>', json }, 'html');

    expect(paths).toEqual({
      html: join(directory, '.codivew', 'codivew-20260728-140509.html'),
    });
    await expect(readFile(paths.html!, 'utf8')).resolves.toBe('<html>review</html>');
  });

  it('writes JSON without embedding HTML', async () => {
    const paths = await writeReports({ html: '<html>review</html>', json }, 'json');
    const content = JSON.parse(await readFile(paths.json!, 'utf8')) as Record<string, unknown>;

    expect(paths.json).toBe(join(directory, '.codivew', 'codivew-20260728-140509.json'));
    expect(content).toMatchObject({ schemaVersion: 1, reviewId: 'review-id' });
    expect(content).not.toHaveProperty('html');
  });

  it('writes HTML and JSON with the same requested base name', async () => {
    const paths = await writeReports(
      { html: '<html>review</html>', json },
      'both',
      join(directory, 'review.html'),
    );

    expect(paths).toEqual({
      html: join(directory, 'review.html'),
      json: join(directory, 'review.json'),
    });
  });

  it('does not overwrite reports created in the same second', async () => {
    await writeReports({ html: '<html>first</html>', json }, 'both');
    const paths = await writeReports({ html: '<html>second</html>', json }, 'both');

    expect(paths.html).toBe(join(directory, '.codivew', 'codivew-20260728-140509-001.html'));
    expect(paths.json).toBe(join(directory, '.codivew', 'codivew-20260728-140509-001.json'));
  });
});
