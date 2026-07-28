import { jest } from '@jest/globals';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeReport } from './report.js';

describe('writeReport', () => {
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

  it('writes a timestamped report to .codivew in the current working directory', async () => {
    const outputPath = await writeReport('<html>review</html>');

    expect(outputPath).toBe(join(directory, '.codivew', 'codivew-20260728-140509.html'));
    await expect(readFile(outputPath, 'utf8')).resolves.toBe('<html>review</html>');
  });

  it('does not overwrite a report created in the same second', async () => {
    await writeReport('<html>first</html>');
    const outputPath = await writeReport('<html>second</html>');

    expect(outputPath).toBe(join(directory, '.codivew', 'codivew-20260728-140509-001.html'));
    await expect(readFile(outputPath, 'utf8')).resolves.toBe('<html>second</html>');
  });
});
