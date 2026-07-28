import { z } from 'zod';
import type { ReviewResult } from '../types/review-result.js';
import { parseUnifiedDiff } from '../unified-diff.js';

const positiveLine = z.number().int().positive();

export const reviewIssueSchema = z
  .object({
    severity: z.enum(['must_fix', 'should_fix', 'suggestion']),
    confidence: z.number().min(0).max(1),
    file: z.string().min(1).max(500),
    line: positiveLine,
    endLine: positiveLine.optional(),
    title: z.string().min(1).max(300),
    description: z.string().min(1).max(5000),
    impact: z.string().max(5000).optional(),
    suggestion: z.string().max(5000).optional(),
    codeSnippet: z.string().max(10_000).optional(),
  })
  .strict()
  .superRefine((issue, context) => {
    if (issue.endLine !== undefined && issue.endLine < issue.line) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endLine'],
        message: 'endLine must be greater than or equal to line',
      });
    }
  });

export const reviewResultSchema = z
  .object({
    verdict: z.enum(['approve', 'comment', 'request_changes']),
    risk: z.enum(['low', 'medium', 'high']),
    summary: z.string().min(1).max(2000),
    issues: z.array(reviewIssueSchema).max(100),
    tests: z.array(z.string()).max(30),
  })
  .strict();

export const reviewResultJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'risk', 'summary', 'issues', 'tests'],
  properties: {
    verdict: { type: 'string', enum: ['approve', 'comment', 'request_changes'] },
    risk: { type: 'string', enum: ['low', 'medium', 'high'] },
    summary: { type: 'string' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'confidence', 'file', 'line', 'title', 'description'],
        properties: {
          severity: { type: 'string', enum: ['must_fix', 'should_fix', 'suggestion'] },
          confidence: { type: 'number' },
          file: { type: 'string' },
          line: { type: 'integer' },
          endLine: { type: 'integer' },
          title: { type: 'string' },
          description: { type: 'string' },
          impact: { type: 'string' },
          suggestion: { type: 'string' },
          codeSnippet: { type: 'string' },
        },
      },
    },
    tests: { type: 'array', items: { type: 'string' } },
  },
} as const;

export function parseReviewResult(
  input: unknown,
  reviewedFiles: readonly string[],
  diff?: string,
): ReviewResult {
  const result = reviewResultSchema.parse(input);
  const files = new Set(reviewedFiles);
  const linesByFile =
    diff === undefined
      ? undefined
      : new Map(
          parseUnifiedDiff(diff).map((file) => [
            file.path,
            new Set(file.hunks.flatMap((hunk) => hunk.lines.flatMap((line) => line.newLine ?? []))),
          ]),
        );
  for (const [index, issue] of result.issues.entries()) {
    const normalizedFile = issue.file.replaceAll('\\', '/');
    if (!files.has(normalizedFile)) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: ['issues', index, 'file'],
          message: 'file must be one of the reviewed files',
        },
      ]);
    }
    if (linesByFile !== undefined && !linesByFile.get(normalizedFile)?.has(issue.line)) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: ['issues', index, 'line'],
          message: 'line must exist on the new side of the reviewed diff',
        },
      ]);
    }
  }
  if (result.issues.some((issue) => issue.severity === 'must_fix')) {
    return { ...result, verdict: 'request_changes' };
  }
  if (result.issues.length > 0 && result.verdict === 'approve') {
    return { ...result, verdict: 'comment' };
  }
  return result;
}
