const assert = require('node:assert/strict');
const vscode = require('vscode');

async function run() {
  const extension = vscode.extensions.getExtension('knsan189.codivew-vscode');
  assert.ok(extension, 'Codivew extension should be available in the Extension Host.');

  await extension.activate();
  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes('codivew.reviewWorking'));
  assert.ok(commands.includes('codivew.reviewStaged'));
  assert.ok(commands.includes('codivew.reviewBranch'));
  assert.ok(commands.includes('codivew.reviewView.focus'));
  console.log('✓ activates and registers review commands');

  const ollamaUrl = process.env.CODIVEW_TEST_OLLAMA_URL;
  assert.ok(ollamaUrl, 'Mock Ollama URL should be provided by the test runner.');
  const configuration = vscode.workspace.getConfiguration('codivew');
  await configuration.update('ollamaUrl', ollamaUrl, vscode.ConfigurationTarget.Global);
  await configuration.update('model', 'codivew-test-model', vscode.ConfigurationTarget.Global);

  await vscode.commands.executeCommand('codivew.reviewView.focus');
  await waitForModelRequest(ollamaUrl);
  console.log('✓ opens the Codivew Activity Bar view and loads Ollama models');

  await vscode.commands.executeCommand('codivew.reviewWorking');
  const diagnostics = vscode.languages
    .getDiagnostics()
    .flatMap(([, items]) => items)
    .filter((diagnostic) => diagnostic.source === 'Codivew');
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].code, 'suggestion');
  assert.match(diagnostics[0].message, /변경값 확인/);
  console.log('✓ reviews a Git change and publishes a diagnostic');
}

async function waitForModelRequest(ollamaUrl) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const response = await fetch(`${ollamaUrl}/test/state`);
    const state = await response.json();
    if (state.tagsRequestCount > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.fail('React Webview should request the Ollama /api/tags endpoint.');
}

module.exports = { run };
