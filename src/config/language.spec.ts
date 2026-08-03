import { getLanguage, parseLanguage, setLanguage, t } from './language.js';

describe('language', () => {
  afterEach(() => setLanguage('ko-KR'));

  it('uses Korean by default and switches to English', () => {
    expect(getLanguage()).toBe('ko-KR');
    expect(t('cli.reviewComplete')).toBe('리뷰 생성 완료');
    setLanguage('en');
    expect(t('cli.reviewComplete')).toBe('Review complete');
  });

  it('accepts only supported languages', () => {
    expect(parseLanguage('ko-KR')).toBe('ko-KR');
    expect(parseLanguage('en')).toBe('en');
    expect(parseLanguage('ja')).toBeUndefined();
  });

  it('interpolates named values', () => {
    expect(t('argument.unknown', { argument: '--bad' })).toBe('알 수 없는 인자입니다: --bad');
  });
});
