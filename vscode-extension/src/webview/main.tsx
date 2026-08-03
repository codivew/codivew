/** @jsxImportSource react */
import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import type {
  DiffStats,
  ExtensionMessage,
  ReviewResultSummary,
  ReviewStatus,
  WebviewInitialState,
  WebviewMessage,
} from './protocol.js';
import './review.css';

type VsCodeApi = {
  postMessage(message: ExtensionMessage): void;
  getState(): PersistedState | undefined;
  setState(state: PersistedState): void;
};

type PersistedState = {
  workspaceIndex: number;
  ollamaUrl: string;
  model: string;
  mode: string;
  baseBranch: string;
};

type ModelsStatus = 'idle' | 'loading' | 'loaded' | 'error';
type DiffStatsStatus = 'idle' | 'loading' | 'loaded' | 'error';

const emptyDiffStats = (maxDiffChars: number): DiffStats => ({
  files: [],
  fileCount: 0,
  additions: 0,
  deletions: 0,
  changedLineCount: 0,
  filteredCharCount: 0,
  maxDiffChars,
});

declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();

function ReviewApp({ initial }: { initial: WebviewInitialState }): React.JSX.Element {
  const saved = vscode.getState();
  const [workspaceIndex, setWorkspaceIndex] = useState(
    saved?.workspaceIndex ?? initial.workspaces[0]?.index ?? -1,
  );
  const [ollamaUrl, setOllamaUrl] = useState(saved?.ollamaUrl ?? initial.ollamaUrl);
  const [model, setModel] = useState(saved?.model ?? initial.model);
  const [mode, setMode] = useState(saved?.mode ?? 'working');
  const [baseBranch, setBaseBranch] = useState(saved?.baseBranch ?? initial.baseBranch);
  const [status, setStatus] = useState<ReviewStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('리뷰할 준비가 되었습니다.');
  const [result, setResult] = useState<ReviewResultSummary>();
  const [models, setModels] = useState<string[]>([]);
  const [modelsStatus, setModelsStatus] = useState<ModelsStatus>('idle');
  const [modelsMessage, setModelsMessage] = useState('Ollama URL을 입력하세요.');
  const [diffStats, setDiffStats] = useState<DiffStats>(() => emptyDiffStats(initial.maxDiffChars));
  const [diffStatsStatus, setDiffStatsStatus] = useState<DiffStatsStatus>('idle');
  const [diffStatsMessage, setDiffStatsMessage] = useState('변경 범위를 계산하는 중...');
  const modelsRequestId = useRef(0);
  const diffStatsRequestId = useRef(0);

  const running = status === 'running';
  const hasWorkspace = initial.workspaces.length > 0;
  const hasModels = modelsStatus === 'loaded' && models.length > 0;
  const diffTooLarge = diffStats.filteredCharCount > diffStats.maxDiffChars;

  useEffect(() => {
    const listener = ({ data }: MessageEvent<WebviewMessage>): void => {
      if (data.type === 'models') {
        if (data.requestId !== modelsRequestId.current) return;
        setModels(data.models);
        setModelsStatus(data.status);
        setModelsMessage(data.message);
        if (data.status === 'loaded') {
          setModel((current) => (data.models.includes(current) ? current : (data.models[0] ?? '')));
        }
        return;
      }
      if (data.type === 'diffStats') {
        if (data.requestId !== diffStatsRequestId.current) return;
        setDiffStatsStatus(data.status);
        setDiffStatsMessage(data.message);
        setDiffStats(data.stats ?? emptyDiffStats(initial.maxDiffChars));
        return;
      }
      setStatus(data.status);
      setStatusMessage(data.message);
      if (data.status === 'completed' && data.result !== undefined) setResult(data.result);
    };
    window.addEventListener('message', listener);
    return (): void => window.removeEventListener('message', listener);
  }, []);

  useEffect(() => {
    vscode.setState({ workspaceIndex, ollamaUrl, model, mode, baseBranch });
  }, [workspaceIndex, ollamaUrl, model, mode, baseBranch]);

  useEffect(() => {
    const validUrl = validHttpUrl(ollamaUrl);
    const requestId = ++modelsRequestId.current;
    if (validUrl === undefined) {
      setModels([]);
      setModelsStatus('idle');
      setModelsMessage('올바른 HTTP 또는 HTTPS Ollama URL을 입력하세요.');
      return;
    }

    setModels([]);
    setModelsStatus('loading');
    setModelsMessage('설치된 모델을 조회하는 중...');
    const timeout = window.setTimeout(() => {
      vscode.postMessage({ type: 'loadModels', ollamaUrl: validUrl, requestId });
    }, 400);
    return (): void => window.clearTimeout(timeout);
  }, [ollamaUrl]);

  useEffect(() => {
    const requestId = ++diffStatsRequestId.current;
    if (workspaceIndex < 0) {
      setDiffStats(emptyDiffStats(initial.maxDiffChars));
      setDiffStatsStatus('idle');
      setDiffStatsMessage('워크스페이스를 선택하세요.');
      return;
    }
    if (mode === 'branch' && baseBranch.trim().length === 0) {
      setDiffStats(emptyDiffStats(initial.maxDiffChars));
      setDiffStatsStatus('idle');
      setDiffStatsMessage('기준 브랜치를 입력하세요.');
      return;
    }

    setDiffStats(emptyDiffStats(initial.maxDiffChars));
    setDiffStatsStatus('loading');
    setDiffStatsMessage('Git 변경량을 계산하는 중...');
    const timeout = window.setTimeout(() => {
      vscode.postMessage({
        type: 'loadDiffStats',
        workspaceIndex,
        mode,
        baseBranch,
        requestId,
      });
    }, 300);
    return (): void => window.clearTimeout(timeout);
  }, [workspaceIndex, mode, baseBranch]);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    vscode.postMessage({
      type: 'review',
      workspaceIndex,
      ollamaUrl,
      model,
      mode,
      baseBranch,
    });
  };

  return (
    <main className="review-view">
      <header className="hero">
        <div className="eyebrow">Local AI code review</div>
        <h1>Codivew</h1>
        <p className="lead">변경사항을 선택하고 리뷰를 직접 시작하세요.</p>
      </header>

      <form className="card" onSubmit={submit}>
        <Field label="워크스페이스" htmlFor="workspace">
          <select
            id="workspace"
            disabled={!hasWorkspace || running}
            value={workspaceIndex}
            onChange={(event) => setWorkspaceIndex(Number(event.target.value))}
          >
            {!hasWorkspace && <option value={-1}>열린 워크스페이스가 없습니다</option>}
            {initial.workspaces.map((workspace) => (
              <option key={workspace.index} value={workspace.index}>
                {workspace.name} · {workspace.path}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Ollama URL" htmlFor="ollama-url">
          <input
            id="ollama-url"
            type="url"
            value={ollamaUrl}
            placeholder="http://localhost:11434"
            disabled={running}
            onChange={(event) => setOllamaUrl(event.target.value)}
            required
          />
          <div className="hint">입력한 주소는 Codivew 사용자 설정에 저장됩니다.</div>
        </Field>

        <Field label="모델" htmlFor="model">
          <select
            id="model"
            value={model}
            disabled={running || !hasModels}
            onChange={(event) => setModel(event.target.value)}
            required
          >
            {!hasModels && (
              <option value="">
                {modelsStatus === 'loading' ? '모델 조회 중...' : '선택 가능한 모델이 없습니다'}
              </option>
            )}
            {models.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <div className="hint" data-status={modelsStatus}>
            {modelsMessage}
          </div>
        </Field>

        <Field label="리뷰 범위" htmlFor="mode">
          <select
            id="mode"
            value={mode}
            disabled={running}
            onChange={(event) => setMode(event.target.value)}
          >
            <option value="working">Working tree</option>
            <option value="staged">Staged changes</option>
            <option value="branch">Branch changes</option>
          </select>
        </Field>

        <Field label="기준 브랜치" htmlFor="base-branch">
          <input
            id="base-branch"
            value={baseBranch}
            disabled={mode !== 'branch' || running}
            onChange={(event) => setBaseBranch(event.target.value)}
            required={mode === 'branch'}
          />
        </Field>

        <section
          className="diff-summary"
          data-status={diffStatsStatus}
          data-over-limit={diffTooLarge}
        >
          <div className="diff-summary-header">
            <span>리뷰 대상</span>
            <small>{diffStatsMessage}</small>
          </div>
          {diffStatsStatus === 'loading' && (
            <div className="diff-placeholder" aria-live="polite">
              파일 목록을 불러오는 중...
            </div>
          )}
          {diffStatsStatus === 'error' && (
            <div className="diff-placeholder error" aria-live="polite">
              변경 파일을 불러오지 못했습니다.
            </div>
          )}
          {diffStatsStatus === 'loaded' && diffStats.files.length === 0 && (
            <div className="diff-placeholder" aria-live="polite">
              리뷰할 변경 파일이 없습니다.
            </div>
          )}
          {diffStatsStatus === 'loaded' && diffStats.files.length > 0 && (
            <>
              <div className="file-summary" aria-live="polite">
                <strong>{formatNumber(diffStats.fileCount)}개 파일</strong>
                <span>{formatNumber(diffStats.changedLineCount)}줄 변경</span>
                <span className="additions">+{formatNumber(diffStats.additions)}</span>
                <span className="deletions">-{formatNumber(diffStats.deletions)}</span>
              </div>
              <ul className="file-list">
                {diffStats.files.map((path) => {
                  const parts = splitFilePath(path);
                  return (
                    <li key={path} title={path}>
                      <FileIcon />
                      <span className="file-path">
                        {parts.directory !== '' && (
                          <span className="file-directory">{parts.directory}/</span>
                        )}
                        <span className="file-name">{parts.name}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="diff-size">
                <div className="diff-size-label">
                  <span>필터링된 Diff</span>
                  <strong>
                    {formatNumber(diffStats.filteredCharCount)} /{' '}
                    {formatNumber(diffStats.maxDiffChars)}자
                  </strong>
                </div>
                <div
                  className="diff-size-track"
                  role="progressbar"
                  aria-label="필터링된 Diff 크기"
                  aria-valuenow={diffStats.filteredCharCount}
                  aria-valuemin={0}
                  aria-valuemax={diffStats.maxDiffChars}
                >
                  <div
                    className="diff-size-value"
                    style={{
                      width: `${Math.min(
                        100,
                        (diffStats.filteredCharCount / diffStats.maxDiffChars) * 100,
                      )}%`,
                    }}
                  />
                </div>
                {diffTooLarge && (
                  <div className="diff-size-error">
                    최대 크기를 {formatNumber(diffStats.filteredCharCount - diffStats.maxDiffChars)}
                    자 초과했습니다.
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        <div className="actions">
          <button
            type="submit"
            disabled={
              !hasWorkspace ||
              !hasModels ||
              diffStatsStatus !== 'loaded' ||
              diffStats.fileCount === 0 ||
              diffTooLarge ||
              running
            }
          >
            리뷰 시작
          </button>
          {running && (
            <button
              className="secondary"
              type="button"
              onClick={() => vscode.postMessage({ type: 'cancel' })}
            >
              취소
            </button>
          )}
        </div>

        <div className="status" data-status={status} role="status" aria-live="polite">
          {statusMessage}
        </div>

        {result !== undefined && (
          <section className="result">
            <div className="metrics">
              <Metric value={result.verdict} label="판정" />
              <Metric value={result.reviewedFileCount} label="파일" />
              <Metric value={result.issueCount} label="항목" />
            </div>
            <button
              className="secondary report-button"
              type="button"
              onClick={() => vscode.postMessage({ type: 'openReport' })}
            >
              전체 리포트 열기
            </button>
          </section>
        )}
      </form>
    </main>
  );
}

function validHttpUrl(value: string): string | undefined {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return value.trim().replace(/\/$/, '');
  } catch {
    return undefined;
  }
}

function formatNumber(value: number): string {
  return value.toLocaleString('ko-KR');
}

function splitFilePath(path: string): { directory: string; name: string } {
  const separator = path.lastIndexOf('/');
  return separator < 0
    ? { directory: '', name: path }
    : { directory: path.slice(0, separator), name: path.slice(separator + 1) };
}

function FileIcon(): React.JSX.Element {
  return (
    <svg className="file-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 1.5h6l4 4V14.5H3z" />
      <path d="M9 1.5v4h4" />
    </svg>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

function Metric({ value, label }: { value: string | number; label: string }): React.JSX.Element {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

const root = document.getElementById('root');
if (root === null) throw new Error('Codivew Webview root element is missing.');
const encodedState = root.dataset.initialState;
if (encodedState === undefined) throw new Error('Codivew Webview initial state is missing.');
const initial = JSON.parse(encodedState) as WebviewInitialState;
createRoot(root).render(
  <React.StrictMode>
    <ReviewApp initial={initial} />
  </React.StrictMode>,
);
