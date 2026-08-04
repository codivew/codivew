import type { Language } from '../../config/language.js';

export enum ReviewMode {
  WORKING = 'working',
  STAGED = 'staged',
  BRANCH = 'branch',
}

export type ReviewRequest = {
  repository: string;
  locale?: Language;
  baseBranch?: string;
  mode: ReviewMode;
  commitSha?: string;
  projectContext?: string[];
  diff: string;
};
