export type ReviewVerdict = 'approve' | 'comment' | 'request_changes';
export type ReviewRisk = 'low' | 'medium' | 'high';
export type ReviewSeverity = 'must_fix' | 'should_fix' | 'suggestion';

export type ReviewIssue = {
  severity: ReviewSeverity;
  confidence: number;
  file: string;
  line: number;
  endLine?: number;
  title: string;
  description: string;
  impact?: string;
  suggestion?: string;
  codeSnippet?: string;
};

export type ReviewResult = {
  verdict: ReviewVerdict;
  risk: ReviewRisk;
  summary: string;
  issues: ReviewIssue[];
  tests: string[];
};
