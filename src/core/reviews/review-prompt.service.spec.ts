import { setLanguage } from '../config/language.js';
import { ReviewPromptService } from './review-prompt.service.js';
import { ReviewMode } from './types/review-request.js';

const filtered = {
  diff: 'diff --git a/a.ts b/a.ts\n',
  reviewedFiles: ['a.ts'],
  originalFileCount: 1,
  filteredFileCount: 0,
  originalCharCount: 28,
  filteredCharCount: 28,
};

describe('ReviewPromptService language', () => {
  afterEach(() => setLanguage('ko-KR'));

  it('requests English feedback when English is selected', () => {
    setLanguage('en');
    const prompts = new ReviewPromptService().build(
      { repository: 'repo', mode: ReviewMode.STAGED, diff: filtered.diff },
      filtered,
    );

    expect(prompts.system).toContain('Write every explanation in English.');
    expect(prompts.user).toContain('Review the following changes');
  });

  it('uses the request locale instead of the global language', () => {
    setLanguage('ko-KR');
    const english = new ReviewPromptService().build(
      { repository: 'repo', locale: 'en', mode: ReviewMode.STAGED, diff: filtered.diff },
      filtered,
    );

    setLanguage('en');
    const korean = new ReviewPromptService().build(
      { repository: 'repo', locale: 'ko-KR', mode: ReviewMode.STAGED, diff: filtered.diff },
      filtered,
    );

    expect(english.system).toContain('Write every explanation in English.');
    expect(english.user).toContain('Review the following changes');
    expect(korean.system).toContain('모든 설명은 한국어로 작성한다.');
    expect(korean.user).toContain('다음 변경사항을 리뷰');
  });
});
