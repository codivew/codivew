export enum ReviewMode {
  WORKING = 'working',
  STAGED = 'staged',
  BRANCH = 'branch',
}

export type ReviewRequest = {
  repository: string;
  baseBranch?: string;
  mode: ReviewMode;
  commitSha?: string;
  projectContext?: string[];
  diff: string;
};
