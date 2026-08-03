import { isAbsolute, relative, resolve } from 'node:path';
import * as vscode from 'vscode';
import {
  ERROR_CODES,
  ReviewError,
  runReview,
  type ReviewIssue,
  type ReviewMode,
  type ReviewProgressStage,
  type RunReviewResult,
} from '../../src/core/index.js';

const DIAGNOSTIC_SOURCE = 'Codivew';

export type ReviewInput = {
  folder: vscode.WorkspaceFolder;
  mode: ReviewMode;
  baseBranch: string;
  ollamaUrl?: string;
  model?: string;
  projectContext: string[];
  openReport: boolean;
};

export type ReviewHooks = {
  onProgress?: (stage: ReviewProgressStage) => void;
  onCompleted?: (result: RunReviewResult) => void;
  onCancelled?: () => void;
  onError?: (message: string) => void;
};

export class ReviewController {
  private activeController: AbortController | undefined;
  private latestResult: RunReviewResult | undefined;

  constructor(private readonly diagnostics: vscode.DiagnosticCollection) {}

  async run(input: ReviewInput, hooks: ReviewHooks = {}): Promise<RunReviewResult | undefined> {
    if (this.activeController !== undefined) {
      const message = '이미 Codivew 리뷰가 진행 중입니다.';
      hooks.onError?.(message);
      void vscode.window.showWarningMessage(message);
      return undefined;
    }

    const controller = new AbortController();
    this.activeController = controller;
    try {
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Codivew 리뷰',
          cancellable: true,
        },
        async (progress, token) => {
          const cancellation = token.onCancellationRequested(() => controller.abort());
          try {
            return await runReview({
              cwd: input.folder.uri.fsPath,
              mode: input.mode,
              baseBranch: input.baseBranch,
              projectContext: input.projectContext,
              ollamaUrl: input.ollamaUrl,
              model: input.model,
              signal: controller.signal,
              onProgress: (stage) => {
                progress.report({ message: progressMessage(stage) });
                hooks.onProgress?.(stage);
              },
            });
          } finally {
            cancellation.dispose();
          }
        },
      );

      this.latestResult = result;
      publishDiagnostics(result, this.diagnostics);
      if (input.openReport) this.openReport(result);
      hooks.onCompleted?.(result);
      void vscode.window.showInformationMessage(
        `Codivew 리뷰 완료: ${result.reviewedFileCount}개 파일, ${result.issueCount}개 항목`,
      );
      return result;
    } catch (error) {
      if (
        controller.signal.aborted ||
        (error instanceof ReviewError && error.code === ERROR_CODES.CANCELLED)
      ) {
        hooks.onCancelled?.();
        return undefined;
      }
      const message = error instanceof Error ? error.message : String(error);
      hooks.onError?.(message);
      void vscode.window.showErrorMessage(`Codivew 리뷰 실패: ${message}`);
      return undefined;
    } finally {
      if (this.activeController === controller) this.activeController = undefined;
    }
  }

  cancel(): void {
    this.activeController?.abort();
  }

  openLatestReport(): void {
    if (this.latestResult === undefined) {
      void vscode.window.showInformationMessage('아직 생성된 Codivew 리포트가 없습니다.');
      return;
    }
    this.openReport(this.latestResult);
  }

  private openReport(result: RunReviewResult): void {
    const panel = vscode.window.createWebviewPanel(
      'codivew.reviewReport',
      `Codivew · ${result.request.repository}`,
      vscode.ViewColumn.Beside,
      { enableScripts: false },
    );
    panel.webview.html = result.html;
  }
}

export function progressMessage(stage: ReviewProgressStage): string {
  return {
    'collecting-diff': 'Git 변경사항 수집 중...',
    'generating-review': 'Ollama로 리뷰 생성 중...',
    completed: '리포트 생성 완료',
  }[stage];
}

function publishDiagnostics(
  result: RunReviewResult,
  collection: vscode.DiagnosticCollection,
): void {
  const diagnosticsByFile = new Map<string, { uri: vscode.Uri; items: vscode.Diagnostic[] }>();

  for (const issue of result.json.result.issues) {
    const absolutePath = resolve(result.repositoryRoot, issue.file);
    const relativePath = relative(result.repositoryRoot, absolutePath);
    if (isAbsolute(relativePath) || relativePath.startsWith('..')) continue;

    const uri = vscode.Uri.file(absolutePath);
    const entry = diagnosticsByFile.get(uri.toString()) ?? { uri, items: [] };
    entry.items.push(createDiagnostic(issue));
    diagnosticsByFile.set(uri.toString(), entry);
  }

  collection.clear();
  collection.set([...diagnosticsByFile.values()].map(({ uri, items }) => [uri, items]));
}

function createDiagnostic(issue: ReviewIssue): vscode.Diagnostic {
  const startLine = Math.max(0, issue.line - 1);
  const endLine = Math.max(startLine, (issue.endLine ?? issue.line) - 1);
  const diagnostic = new vscode.Diagnostic(
    new vscode.Range(startLine, 0, endLine, Number.MAX_SAFE_INTEGER),
    `${issue.title}\n${issue.description}`,
    diagnosticSeverity(issue.severity),
  );
  diagnostic.source = DIAGNOSTIC_SOURCE;
  diagnostic.code = issue.severity;
  return diagnostic;
}

function diagnosticSeverity(severity: ReviewIssue['severity']): vscode.DiagnosticSeverity {
  return {
    must_fix: vscode.DiagnosticSeverity.Error,
    should_fix: vscode.DiagnosticSeverity.Warning,
    suggestion: vscode.DiagnosticSeverity.Information,
  }[severity];
}
