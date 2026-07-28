import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { ERROR_CODES } from '../common/constants/error-codes.js';
import { ReviewError } from '../common/errors/review-error.js';

export async function writeReport(html: string, requestedOutput?: string): Promise<string> {
  const defaultPath = join(process.cwd(), '.codivew', `codivew-${formatDateTime(new Date())}.html`);
  const requestedPath = requestedOutput === undefined ? defaultPath : resolve(requestedOutput);
  let outputPath =
    extname(requestedPath).toLowerCase() === '.html' ? requestedPath : `${requestedPath}.html`;

  try {
    await mkdir(dirname(outputPath), { recursive: true });

    if (requestedOutput !== undefined) {
      await writeFile(outputPath, html, { encoding: 'utf8', mode: 0o600 });
      return outputPath;
    }

    for (let sequence = 0; ; sequence += 1) {
      outputPath =
        sequence === 0
          ? defaultPath
          : defaultPath.replace(/\.html$/, `-${String(sequence).padStart(3, '0')}.html`);

      try {
        await writeFile(outputPath, html, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
        return outputPath;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') continue;
        throw error;
      }
    }
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

function formatDateTime(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}
