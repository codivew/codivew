import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { ERROR_CODES } from '../common/constants/error-codes.js';
import { ReviewError } from '../common/errors/review-error.js';

export async function writeReport(
  html: string,
  repository: string,
  reviewId: string,
  requestedOutput?: string,
): Promise<string> {
  const defaultPath = join(tmpdir(), 'codivew', `${safeName(repository)}-${reviewId}.html`);
  const requestedPath = requestedOutput === undefined ? defaultPath : resolve(requestedOutput);
  const outputPath =
    extname(requestedPath).toLowerCase() === '.html' ? requestedPath : `${requestedPath}.html`;

  try {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html, { encoding: 'utf8', mode: 0o600 });
    return outputPath;
  } catch (error) {
    throw new ReviewError(
      ERROR_CODES.OUTPUT_FAILED,
      `리포트를 저장할 수 없습니다: ${outputPath}`,
      error,
    );
  }
}

export async function openReport(outputPath: string): Promise<void> {
  const command =
    process.platform === 'darwin'
      ? { file: 'open', args: [outputPath] }
      : process.platform === 'win32'
        ? { file: 'cmd', args: ['/c', 'start', '', outputPath] }
        : { file: 'xdg-open', args: [outputPath] };

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command.file, command.args, { detached: true, stdio: 'ignore' });
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
    child.once('error', (error) => {
      reject(new ReviewError(ERROR_CODES.OUTPUT_FAILED, '브라우저를 실행할 수 없습니다.', error));
    });
  });
}

function safeName(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'repository';
}
