import { randomBytes } from 'node:crypto';
import * as vscode from 'vscode';
import {
  calculateDiffStats,
  createGitReviewInput,
  ERROR_CODES,
  ReviewError,
  ReviewMode,
  type ReviewProgressStage,
  type RunReviewResult,
} from '../../src/core/index.js';
import { progressMessage, ReviewController } from './review-controller.js';
import type {
  DiffStats,
  ExtensionMessage,
  LoadDiffStatsMessage,
  LoadModelsMessage,
  ReviewMessage,
  WebviewInitialState,
} from './webview/protocol.js';

type OllamaTagsResponse = {
  models?: unknown;
};

export class ReviewViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = 'codivew.reviewView';
  private view: vscode.WebviewView | undefined;
  private diffStatsController: AbortController | undefined;

  constructor(
    private readonly controller: ReviewController,
    private readonly extensionUri: vscode.Uri,
  ) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    const distUri = vscode.Uri.joinPath(this.extensionUri, 'dist');
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [distUri],
    };
    view.webview.html = this.render(view.webview);
    view.webview.onDidReceiveMessage((message: ExtensionMessage) => {
      void this.handleMessage(message);
    });
    view.onDidDispose(() => this.diffStatsController?.abort());
  }

  private async handleMessage(message: ExtensionMessage): Promise<void> {
    if (message.type === 'cancel') {
      this.controller.cancel();
      return;
    }
    if (message.type === 'openReport') {
      this.controller.openLatestReport();
      return;
    }
    if (message.type === 'loadModels') {
      await this.loadModels(message);
      return;
    }
    if (message.type === 'loadDiffStats') {
      await this.loadDiffStats(message);
      return;
    }
    await this.startReview(message);
  }

  private async loadDiffStats(message: LoadDiffStatsMessage): Promise<void> {
    const requestId = numberValue(message.requestId);
    if (requestId === undefined) return;

    const folders = vscode.workspace.workspaceFolders ?? [];
    const workspaceIndex = numberValue(message.workspaceIndex);
    const folder = workspaceIndex === undefined ? undefined : folders[workspaceIndex];
    const mode = reviewMode(message.mode);
    const baseBranch = stringValue(message.baseBranch);
    if (folder === undefined || mode === undefined) {
      this.postDiffStats(requestId, 'error', '리뷰 범위를 확인할 수 없습니다.');
      return;
    }
    if (mode === ReviewMode.BRANCH && baseBranch === undefined) {
      this.postDiffStats(requestId, 'error', '기준 브랜치를 입력하세요.');
      return;
    }

    this.diffStatsController?.abort();
    const controller = new AbortController();
    this.diffStatsController = controller;
    try {
      const input = await createGitReviewInput(folder.uri.fsPath, {
        mode,
        baseBranch: baseBranch ?? 'main',
        signal: controller.signal,
      });
      this.postDiffStats(requestId, 'loaded', diffStatsMessage(mode, baseBranch), {
        ...calculateDiffStats(input.diff),
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ReviewError && error.code === ERROR_CODES.EMPTY_DIFF) {
        this.postDiffStats(requestId, 'loaded', diffStatsMessage(mode, baseBranch), {
          fileCount: 0,
          additions: 0,
          deletions: 0,
          changedLineCount: 0,
        });
        return;
      }
      this.postDiffStats(
        requestId,
        'error',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      if (this.diffStatsController === controller) this.diffStatsController = undefined;
    }
  }

  private async loadModels(message: LoadModelsMessage): Promise<void> {
    const requestId = numberValue(message.requestId);
    if (requestId === undefined) return;

    const ollamaUrl = validHttpUrl(message.ollamaUrl);
    if (ollamaUrl === undefined) {
      this.postModels(requestId, 'error', [], '올바른 Ollama URL을 입력하세요.');
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetch(`${ollamaUrl}/api/tags`, { signal: controller.signal });
      if (!response.ok) {
        this.postModels(
          requestId,
          'error',
          [],
          `모델 목록을 불러오지 못했습니다. (HTTP ${response.status})`,
        );
        return;
      }

      const body = (await response.json()) as OllamaTagsResponse;
      const models = parseModelNames(body.models);
      this.postModels(
        requestId,
        'loaded',
        models,
        models.length === 0
          ? 'Ollama에 설치된 모델이 없습니다.'
          : `${models.length}개 모델을 불러왔습니다.`,
      );
    } catch {
      this.postModels(requestId, 'error', [], `Ollama에 연결할 수 없습니다: ${ollamaUrl}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async startReview(message: ReviewMessage): Promise<void> {
    const folders = vscode.workspace.workspaceFolders ?? [];
    const workspaceIndex = numberValue(message.workspaceIndex);
    const folder = workspaceIndex === undefined ? undefined : folders[workspaceIndex];
    if (folder === undefined) {
      this.postState('error', '리뷰할 워크스페이스를 선택하세요.');
      return;
    }

    const mode = reviewMode(message.mode);
    const baseBranchValue = stringValue(message.baseBranch);
    const baseBranch = baseBranchValue ?? 'main';
    const ollamaUrl = validHttpUrl(message.ollamaUrl);
    const model = stringValue(message.model);
    if (mode === undefined) {
      this.postState('error', '리뷰 범위를 선택하세요.');
      return;
    }
    if (ollamaUrl === undefined) {
      this.postState('error', '올바른 HTTP 또는 HTTPS Ollama URL을 입력하세요.');
      return;
    }
    if (model === undefined) {
      this.postState('error', '사용할 Ollama 모델명을 입력하세요.');
      return;
    }
    if (mode === ReviewMode.BRANCH && baseBranchValue === undefined) {
      this.postState('error', 'branch 리뷰에는 기준 브랜치가 필요합니다.');
      return;
    }

    const configuration = vscode.workspace.getConfiguration('codivew', folder.uri);
    await configuration.update('ollamaUrl', ollamaUrl, vscode.ConfigurationTarget.Global);
    await configuration.update('model', model, vscode.ConfigurationTarget.Global);
    await configuration.update('baseBranch', baseBranch, vscode.ConfigurationTarget.Global);

    this.postState('running', '리뷰를 준비하는 중...');
    await this.controller.run(
      {
        folder,
        mode,
        baseBranch,
        ollamaUrl,
        model,
        projectContext: configuration.get<string[]>('projectContext', []),
        openReport: false,
      },
      {
        onProgress: (stage) => this.postProgress(stage),
        onCompleted: (result) => this.postCompleted(result),
        onCancelled: () => this.postState('cancelled', '리뷰를 취소했습니다.'),
        onError: (message) => this.postState('error', message),
      },
    );
  }

  private postProgress(stage: ReviewProgressStage): void {
    this.postState('running', progressMessage(stage));
  }

  private postCompleted(result: RunReviewResult): void {
    void this.view?.webview.postMessage({
      type: 'state',
      status: 'completed',
      message: result.json.result.summary,
      result: {
        verdict: verdictLabel(result.verdict),
        reviewedFileCount: result.reviewedFileCount,
        issueCount: result.issueCount,
      },
    });
  }

  private postState(status: 'running' | 'cancelled' | 'error', message: string): void {
    void this.view?.webview.postMessage({ type: 'state', status, message });
  }

  private postModels(
    requestId: number,
    status: 'loaded' | 'error',
    models: string[],
    message: string,
  ): void {
    void this.view?.webview.postMessage({ type: 'models', requestId, status, models, message });
  }

  private postDiffStats(
    requestId: number,
    status: 'loaded' | 'error',
    message: string,
    stats?: DiffStats,
  ): void {
    void this.view?.webview.postMessage({
      type: 'diffStats',
      requestId,
      status,
      message,
      ...(stats === undefined ? {} : { stats }),
    });
  }

  private render(webview: vscode.Webview): string {
    const nonce = randomBytes(16).toString('base64');
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.css'),
    );
    const initialState = escapeHtml(JSON.stringify(this.getInitialState()));

    return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';" />
    <link rel="stylesheet" href="${styleUri.toString()}" />
    <title>Codivew</title>
  </head>
  <body>
    <div id="root" data-initial-state="${initialState}"></div>
    <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
  </body>
</html>`;
  }

  private getInitialState(): WebviewInitialState {
    const folders = vscode.workspace.workspaceFolders ?? [];
    const configuration = vscode.workspace.getConfiguration('codivew', folders[0]?.uri);
    return {
      workspaces: folders.map((folder, index) => ({
        index,
        name: folder.name,
        path: folder.uri.fsPath,
      })),
      ollamaUrl: configuration.get('ollamaUrl', 'http://localhost:11434'),
      model: configuration.get('model', 'qwen3.6:35b-a3b-coding-mxfp8'),
      baseBranch: configuration.get('baseBranch', 'main'),
    };
  }
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function reviewMode(value: unknown): ReviewMode | undefined {
  return Object.values(ReviewMode).includes(value as ReviewMode)
    ? (value as ReviewMode)
    : undefined;
}

function validHttpUrl(value: unknown): string | undefined {
  const string = stringValue(value);
  if (string === undefined) return undefined;
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? string.replace(/\/$/, '')
      : undefined;
  } catch {
    return undefined;
  }
}

function parseModelNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.flatMap((model) => {
        if (typeof model !== 'object' || model === null) return [];
        const name = stringValue((model as Record<string, unknown>)['name']);
        return name === undefined ? [] : [name];
      }),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function verdictLabel(verdict: RunReviewResult['verdict']): string {
  return {
    approve: '승인',
    comment: '확인 필요',
    request_changes: '수정 필요',
  }[verdict];
}

function diffStatsMessage(mode: ReviewMode, baseBranch: string | undefined): string {
  return mode === ReviewMode.BRANCH
    ? `${baseBranch ?? 'main'} 기준 변경량`
    : mode === ReviewMode.STAGED
      ? 'Staged changes 변경량'
      : 'Working tree 변경량';
}
