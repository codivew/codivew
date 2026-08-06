import {
  bundledLanguages,
  bundledLanguagesAlias,
  codeToTokensWithThemes,
  type BundledLanguage,
  type ThemedTokenWithVariants,
} from 'shiki';
import type { ParsedDiffFile, ParsedDiffLine } from '../reviews/unified-diff.js';

const SPECIAL_FILENAMES: Record<string, BundledLanguage> = {
  dockerfile: 'dockerfile',
  makefile: 'make',
  'cmakelists.txt': 'cmake',
};

export type HighlightedDiffLines = Map<ParsedDiffLine, ThemedTokenWithVariants[]>;

function languageForPath(path: string): BundledLanguage | 'text' {
  const basename = path.split('/').at(-1)?.toLowerCase() ?? '';
  const specialLanguage = SPECIAL_FILENAMES[basename];
  if (specialLanguage !== undefined) return specialLanguage;

  const extension = basename.split('.').at(-1) ?? '';
  if (extension in bundledLanguages || extension in bundledLanguagesAlias) {
    return extension as BundledLanguage;
  }
  return 'text';
}

async function highlightLines(
  lines: ParsedDiffLine[],
  language: BundledLanguage | 'text',
): Promise<ThemedTokenWithVariants[][]> {
  if (lines.length === 0) return [];

  return codeToTokensWithThemes(lines.map((line) => line.content).join('\n'), {
    lang: language,
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
  });
}

export async function highlightDiff(files: ParsedDiffFile[]): Promise<HighlightedDiffLines> {
  const highlighted: HighlightedDiffLines = new Map();

  await Promise.all(
    files.flatMap((file) => {
      const language = languageForPath(file.path);
      return file.hunks.map(async (hunk) => {
        const oldLines = hunk.lines.filter(
          (line) => line.kind === 'context' || line.kind === 'deletion',
        );
        const newLines = hunk.lines.filter(
          (line) => line.kind === 'context' || line.kind === 'addition',
        );
        const [oldTokens, newTokens] = await Promise.all([
          highlightLines(oldLines, language),
          highlightLines(newLines, language),
        ]);

        oldLines.forEach((line, index) => {
          if (line.kind === 'deletion') highlighted.set(line, oldTokens[index] ?? []);
        });
        newLines.forEach((line, index) => {
          highlighted.set(line, newTokens[index] ?? []);
        });
      });
    }),
  );

  return highlighted;
}
