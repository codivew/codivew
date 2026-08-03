import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { ERROR_CODES, ReviewError, type ReviewJsonReport } from '../core/index.js';
import type { OutputFormat } from './arguments.js';

export type ReportPaths = {
  html?: string;
  json?: string;
};

type ReportContents = {
  html: string;
  json: ReviewJsonReport;
};

export async function writeReports(
  contents: ReportContents,
  format: OutputFormat,
  requestedOutput?: string,
): Promise<ReportPaths> {
  const defaultBase = join(process.cwd(), '.codivew', `codivew-${formatDateTime(new Date())}`);
  const requestedBase =
    requestedOutput === undefined ? undefined : outputBase(resolve(requestedOutput));

  try {
    if (requestedBase !== undefined) {
      const paths = reportPaths(requestedBase, format);
      await writeContents(paths, contents);
      return paths;
    }

    for (let sequence = 0; ; sequence += 1) {
      const base =
        sequence === 0 ? defaultBase : `${defaultBase}-${String(sequence).padStart(3, '0')}`;
      const paths = reportPaths(base, format);
      if (Object.values(paths).some((path) => existsSync(path))) continue;
      await writeContents(paths, contents, 'wx');
      return paths;
    }
  } catch (error) {
    throw new ReviewError(
      ERROR_CODES.OUTPUT_FAILED,
      `리포트를 저장할 수 없습니다: ${requestedBase ?? defaultBase}`,
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

async function writeContents(
  paths: ReportPaths,
  contents: ReportContents,
  flag?: 'wx',
): Promise<void> {
  const firstPath = paths.html ?? paths.json;
  if (firstPath === undefined) return;
  await mkdir(dirname(firstPath), { recursive: true });
  if (paths.html !== undefined) {
    await writeFile(paths.html, contents.html, { encoding: 'utf8', mode: 0o600, flag });
  }
  if (paths.json !== undefined) {
    await writeFile(paths.json, `${JSON.stringify(contents.json, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
      flag,
    });
  }
}

function reportPaths(base: string, format: OutputFormat): ReportPaths {
  return {
    ...(format === 'html' || format === 'both' ? { html: `${base}.html` } : {}),
    ...(format === 'json' || format === 'both' ? { json: `${base}.json` } : {}),
  };
}

function outputBase(path: string): string {
  const extension = extname(path).toLowerCase();
  return extension === '.html' || extension === '.json' ? path.slice(0, -extension.length) : path;
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
