export type ReviewMessage = {
  type: 'review';
  workspaceIndex: unknown;
  mode: unknown;
  baseBranch: unknown;
  ollamaUrl: unknown;
  model: unknown;
};

export type LoadModelsMessage = {
  type: 'loadModels';
  ollamaUrl: unknown;
  requestId: unknown;
};

export type LoadDiffStatsMessage = {
  type: 'loadDiffStats';
  workspaceIndex: unknown;
  mode: unknown;
  baseBranch: unknown;
  requestId: unknown;
};

export type ExtensionMessage =
  | ReviewMessage
  | LoadModelsMessage
  | LoadDiffStatsMessage
  | { type: 'cancel' }
  | { type: 'openReport' };

export type DiffStats = {
  fileCount: number;
  additions: number;
  deletions: number;
  changedLineCount: number;
};

export type ReviewResultSummary = {
  verdict: string;
  reviewedFileCount: number;
  issueCount: number;
};

export type ReviewStatus = 'idle' | 'running' | 'completed' | 'cancelled' | 'error';

export type WebviewMessage =
  | {
      type: 'state';
      status: ReviewStatus;
      message: string;
      result?: ReviewResultSummary;
    }
  | {
      type: 'models';
      requestId: number;
      status: 'loaded' | 'error';
      models: string[];
      message: string;
    }
  | {
      type: 'diffStats';
      requestId: number;
      status: 'loaded' | 'error';
      stats?: DiffStats;
      message: string;
    };

export type WebviewInitialState = {
  workspaces: Array<{ index: number; name: string; path: string }>;
  ollamaUrl: string;
  model: string;
  baseBranch: string;
};
