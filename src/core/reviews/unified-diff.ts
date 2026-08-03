export type DiffLineKind = 'context' | 'addition' | 'deletion' | 'marker';

export type ParsedDiffLine = {
  kind: DiffLineKind;
  content: string;
  oldLine?: number;
  newLine?: number;
};

export type ParsedDiffHunk = {
  header: string;
  lines: ParsedDiffLine[];
};

export type ParsedDiffFile = {
  path: string;
  metadata: string[];
  hunks: ParsedDiffHunk[];
};

export type DiffStats = {
  fileCount: number;
  additions: number;
  deletions: number;
  changedLineCount: number;
};

const normalizePath = (path: string): string =>
  path
    .trim()
    .replace(/^"|"$/g, '')
    .replaceAll('\\', '/')
    .replace(/^[ab]\//, '');

function extractPath(block: string): string | undefined {
  const plusPath = block.match(/^\+\+\+\s+(.+)$/m)?.[1];
  if (plusPath !== undefined && plusPath !== '/dev/null') return normalizePath(plusPath);

  const minusPath = block.match(/^---\s+(.+)$/m)?.[1];
  if (minusPath !== undefined && minusPath !== '/dev/null') return normalizePath(minusPath);

  const header = block.match(/^diff --git\s+a[\\/](.+?)\s+b[\\/](.+)$/m);
  return header?.[2] === undefined ? undefined : normalizePath(header[2]);
}

export function parseUnifiedDiff(diff: string): ParsedDiffFile[] {
  const normalized = diff.replaceAll('\r\n', '\n');
  const starts = [...normalized.matchAll(/^diff --git /gm)].map((match) => match.index);

  return starts.flatMap((start, fileIndex) => {
    const block = normalized.slice(start, starts[fileIndex + 1] ?? normalized.length).trimEnd();
    const path = extractPath(block);
    if (path === undefined) return [];

    const metadata: string[] = [];
    const hunks: ParsedDiffHunk[] = [];
    let currentHunk: ParsedDiffHunk | undefined;
    let oldLine = 0;
    let newLine = 0;

    for (const line of block.split('\n').slice(1)) {
      const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (hunk !== null) {
        oldLine = Number(hunk[1]);
        newLine = Number(hunk[2]);
        currentHunk = { header: line, lines: [] };
        hunks.push(currentHunk);
        continue;
      }

      if (currentHunk === undefined) {
        if (!line.startsWith('--- ') && !line.startsWith('+++ ')) metadata.push(line);
        continue;
      }

      if (line.startsWith('\\ No newline at end of file')) {
        currentHunk.lines.push({ kind: 'marker', content: line });
      } else if (line.startsWith('+')) {
        currentHunk.lines.push({ kind: 'addition', content: line.slice(1), newLine });
        newLine += 1;
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({ kind: 'deletion', content: line.slice(1), oldLine });
        oldLine += 1;
      } else {
        currentHunk.lines.push({
          kind: 'context',
          content: line.startsWith(' ') ? line.slice(1) : line,
          oldLine,
          newLine,
        });
        oldLine += 1;
        newLine += 1;
      }
    }

    return [{ path, metadata: metadata.filter(Boolean), hunks }];
  });
}

export function calculateDiffStats(diff: string): DiffStats {
  const files = parseUnifiedDiff(diff);
  let additions = 0;
  let deletions = 0;

  for (const file of files) {
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.kind === 'addition') additions += 1;
        if (line.kind === 'deletion') deletions += 1;
      }
    }
  }

  return {
    fileCount: files.length,
    additions,
    deletions,
    changedLineCount: additions + deletions,
  };
}
