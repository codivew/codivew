import * as vscode from 'vscode';
import { ReviewMode } from '../../src/core/index.js';
import { ReviewController } from './review-controller.js';
import { ReviewViewProvider } from './review-view-provider.js';

export function activate(context: vscode.ExtensionContext): void {
  console.info('[Codivew] Extension activated.');
  const diagnostics = vscode.languages.createDiagnosticCollection('codivew');
  const controller = new ReviewController(diagnostics);
  const provider = new ReviewViewProvider(controller, context.extensionUri);

  context.subscriptions.push(
    diagnostics,
    vscode.window.registerWebviewViewProvider(ReviewViewProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    registerReviewCommand('codivew.reviewWorking', ReviewMode.WORKING, controller),
    registerReviewCommand('codivew.reviewStaged', ReviewMode.STAGED, controller),
    registerReviewCommand('codivew.reviewBranch', ReviewMode.BRANCH, controller),
    vscode.commands.registerCommand('codivew.openLatestReport', () =>
      controller.openLatestReport(),
    ),
  );
}

export function deactivate(): void {}

function registerReviewCommand(
  command: string,
  mode: ReviewMode,
  controller: ReviewController,
): vscode.Disposable {
  return vscode.commands.registerCommand(command, async () => {
    const folder = await selectWorkspaceFolder();
    if (folder === undefined) return;

    const configuration = vscode.workspace.getConfiguration('codivew', folder.uri);
    const configuredBaseBranch = configuration.get('baseBranch', 'main');
    const baseBranch =
      mode === ReviewMode.BRANCH
        ? await vscode.window.showInputBox({
            title: 'Codivew branch review',
            prompt: '기준 브랜치를 입력하세요.',
            value: configuredBaseBranch,
            validateInput: (value) =>
              value.trim().length === 0 ? '브랜치명이 필요합니다.' : undefined,
          })
        : configuredBaseBranch;
    if (baseBranch === undefined) return;

    await controller.run({
      folder,
      mode,
      baseBranch: baseBranch.trim(),
      projectContext: configuration.get<string[]>('projectContext', []),
      ollamaUrl: configuration.get<string>('ollamaUrl'),
      model: configuration.get<string>('model'),
      openReport: true,
    });
  });
}

async function selectWorkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
  const folders = vscode.workspace.workspaceFolders;
  if (folders === undefined || folders.length === 0) {
    await vscode.window.showWarningMessage('Codivew를 실행할 워크스페이스 폴더를 여세요.');
    return undefined;
  }
  if (folders.length === 1) return folders[0];

  const selected = await vscode.window.showQuickPick(
    folders.map((folder) => ({ label: folder.name, description: folder.uri.fsPath, folder })),
    { title: 'Codivew를 실행할 워크스페이스 선택' },
  );
  return selected?.folder;
}
