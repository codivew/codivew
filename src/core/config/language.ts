export const SUPPORTED_LANGUAGES = ['ko-KR', 'en'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const MESSAGES = {
  'common.notSet': { 'ko-KR': '(미설정)', en: '(not set)' },
  'common.seconds': { 'ko-KR': '{value}초', en: '{value}s' },
  'argument.unsupportedOutputFormat': {
    'ko-KR': '지원하지 않는 출력 형식입니다: {format} (html, json, both 중 선택)',
    en: 'Unsupported output format: {format} (choose html, json, or both)',
  },
  'argument.unknown': {
    'ko-KR': '알 수 없는 인자입니다: {argument}',
    en: 'Unknown argument: {argument}',
  },
  'argument.contextLimit': {
    'ko-KR': '--context는 최대 20개까지 지정할 수 있습니다.',
    en: '--context can be used up to 20 times.',
  },
  'argument.unsupportedConfigKey': {
    'ko-KR': '지원하지 않는 설정 항목입니다: {key}',
    en: 'Unsupported configuration key: {key}',
  },
  'argument.valueRequired': {
    'ko-KR': '{option} 옵션에 값이 필요합니다.',
    en: '{option} requires a value.',
  },
  'config.title': { 'ko-KR': 'Codivew 설정', en: 'Codivew Configuration' },
  'config.fileLabel': { 'ko-KR': '  파일        ', en: '  File        ' },
  'config.saved': { 'ko-KR': '{key} 설정을 저장했습니다.', en: '{key} configuration saved.' },
  'config.modelRequired': {
    'ko-KR': '모델명은 비어 있을 수 없습니다.',
    en: 'The model name cannot be empty.',
  },
  'config.languageInvalid': {
    'ko-KR': '언어는 ko-KR 또는 en이어야 합니다.',
    en: 'Language must be ko-KR or en.',
  },
  'config.urlInvalid': {
    'ko-KR': 'Ollama URL은 http 또는 https 주소여야 합니다.',
    en: 'The Ollama URL must use http or https.',
  },
  'config.readFailed': {
    'ko-KR': '설정 파일을 읽을 수 없습니다: {path}',
    en: 'Unable to read the configuration file: {path}',
  },
  'config.invalid': {
    'ko-KR': '설정 파일이 올바르지 않습니다: {path}',
    en: 'The configuration file is invalid: {path}',
  },
  'config.saveFailed': {
    'ko-KR': '설정을 저장할 수 없습니다: {path}',
    en: 'Unable to save the configuration: {path}',
  },
  'setup.ttyRequired': {
    'ko-KR': '대화형 터미널에서 codivew setup을 실행하거나 config set 명령을 사용하세요.',
    en: 'Run codivew setup in an interactive terminal or use the config set command.',
  },
  'setup.title': { 'ko-KR': 'Codivew 초기 설정', en: 'Codivew Setup' },
  'setup.languageMenu': {
    'ko-KR': '언어 / Language\n  1. 한국어 (ko-KR)\n  2. English (en)',
    en: '언어 / Language\n  1. 한국어 (ko-KR)\n  2. English (en)',
  },
  'setup.languageQuestion': {
    'ko-KR': '선택 / Select ({selection}): ',
    en: '선택 / Select ({selection}): ',
  },
  'setup.languageInvalid': {
    'ko-KR': 'ko-KR 또는 en을 입력하세요. / Enter ko-KR or en.',
    en: 'ko-KR 또는 en을 입력하세요. / Enter ko-KR or en.',
  },
  'setup.saved': { 'ko-KR': '설정을 저장했습니다.', en: 'Configuration saved.' },
  'setup.ollamaCheckFailed': {
    'ko-KR': 'Ollama 연결 확인에 실패했습니다. (HTTP {status})',
    en: 'Failed to check the Ollama connection. (HTTP {status})',
  },
  'setup.connectionTimeout': {
    'ko-KR': '연결 시간이 초과되었습니다.',
    en: 'The connection timed out.',
  },
  'setup.connectionFailed': { 'ko-KR': '연결할 수 없습니다.', en: 'Unable to connect.' },
  'setup.ollamaError': { 'ko-KR': 'Ollama에 {reason}', en: 'Ollama: {reason}' },
  'setup.checkingOllama': {
    'ko-KR': 'Ollama 연결 확인 중...',
    en: 'Checking the Ollama connection...',
  },
  'setup.noModels': {
    'ko-KR': '설치된 모델이 없습니다. 먼저 {command}을 실행하세요.',
    en: 'No models are installed. Run {command} first.',
  },
  'setup.connected': { 'ko-KR': '연결됨', en: 'Connected' },
  'setup.modelCount': { 'ko-KR': '모델 {count}개', en: 'Models: {count}' },
  'setup.retryUrl': { 'ko-KR': 'URL을 다시 입력하세요.', en: 'Enter the URL again.' },
  'setup.modelToUse': { 'ko-KR': '사용할 모델', en: 'Model to use' },
  'setup.select': { 'ko-KR': '선택', en: 'Select' },
  'setup.invalidModel': {
    'ko-KR': '번호 또는 모델명을 정확히 입력하세요.',
    en: 'Enter a valid number or model name.',
  },
  'update.available': {
    'ko-KR': 'Codivew 새 버전이 있습니다: {currentVersion} → {latestVersion}',
    en: 'A new Codivew version is available: {currentVersion} → {latestVersion}',
  },
  'update.command': {
    'ko-KR': '업데이트: npm install -g {packageName}@latest',
    en: 'Update: npm install -g {packageName}@latest',
  },
  'git.noChanges': {
    'ko-KR': '리뷰할 변경사항이 없습니다. (mode: {mode})',
    en: 'There are no changes to review. (mode: {mode})',
  },
  'git.commandFailed': { 'ko-KR': 'Git 명령 실행에 실패했습니다.', en: 'The Git command failed.' },
  'report.saveFailed': {
    'ko-KR': '리포트를 저장할 수 없습니다: {path}',
    en: 'Unable to save the report: {path}',
  },
  'report.browserFailed': {
    'ko-KR': '브라우저를 실행할 수 없습니다.',
    en: 'Unable to open the browser.',
  },
  'ollama.requestFailed': {
    'ko-KR': 'Ollama 요청에 실패했습니다. (HTTP {status})',
    en: 'The Ollama request failed. (HTTP {status})',
  },
  'ollama.timeout': {
    'ko-KR': 'Ollama 응답 시간이 {timeout}ms를 초과했습니다.',
    en: 'The Ollama response exceeded {timeout}ms.',
  },
  'ollama.connectFailed': {
    'ko-KR': 'Ollama에 연결할 수 없습니다: {url}',
    en: 'Unable to connect to Ollama: {url}',
  },
  'ollama.invalidJson': {
    'ko-KR': 'Ollama가 올바른 JSON 리뷰 결과를 반환하지 않았습니다.',
    en: 'Ollama did not return a valid JSON review result.',
  },
  'review.emptyDiff': {
    'ko-KR': '리뷰할 수 있는 Diff가 없습니다.',
    en: 'There is no reviewable diff.',
  },
  'review.diffTooLarge': {
    'ko-KR': '필터링된 Diff가 최대 크기 {max}자를 초과했습니다. (현재 {current}자)',
    en: 'The filtered diff exceeds the {max} character limit (currently {current}).',
  },
  'review.cancelled': { 'ko-KR': '리뷰가 취소되었습니다.', en: 'The review was cancelled.' },
  'review.validationFailedTwice': {
    'ko-KR': '두 번의 시도에서 모두 모델 응답 검증에 실패했습니다.',
    en: 'Model response validation failed on both attempts.',
  },
  'review.invalidResponse': {
    'ko-KR': '응답이 유효한 JSON이 아니거나 필수 필드가 없습니다.',
    en: 'The response is not valid JSON or is missing required fields.',
  },
  'review.retryPrompt': {
    'ko-KR':
      '이전 응답의 검증 실패 요약: {reason}\nJSON 스키마를 정확히 지켜 다시 응답하세요. 이전 응답 본문은 제공하지 않습니다.',
    en: 'Previous response validation failure: {reason}\nRespond again using the exact JSON schema. The previous response body is not included.',
  },
  'prompt.system': {
    'ko-KR': `너는 엄격하지만 불필요한 지적을 만들지 않는 시니어 코드 리뷰어다.
제공된 Git diff 안에서 확인할 수 있는 문제만 검토한다.
모든 설명은 한국어로 작성한다.
반드시 지정된 JSON 구조만 반환한다.

리뷰 원칙:
- 실제 버그 가능성이 있는 문제를 우선한다.
- 단순 취향이나 스타일 차이는 지적하지 않는다.
- diff로 확인할 수 없는 내용을 단정하지 않는다.
- 추측이 포함되면 confidence를 낮게 설정한다.
- 문제가 없으면 issues를 빈 배열로 반환한다.
- 억지로 지적 개수를 채우지 않는다.
- 변경되지 않은 코드 자체를 문제로 삼지 않는다.
- diff에 없는 파일명을 생성하지 않는다.
- 모든 피드백은 line을 반드시 포함한다.
- line과 endLine은 +++ 대상인 변경 후 파일의 실제 라인 번호를 사용한다.
- diff의 추가 또는 변경된 라인에 피드백을 연결한다.
- 같은 원인의 문제를 여러 건으로 중복 생성하지 않는다.
- 코드 전체를 다시 작성하지 않는다.

심각도:
- must_fix: 런타임 오류, 잘못된 비즈니스 로직, 데이터 손실, 보안 취약점, 경쟁 상태, 치명적인 성능 문제
- should_fix: 상태 동기화 오류, React Hook 의존성 오류, 타입 안정성 문제, 예외 처리 누락, 중요한 유지보수 문제, 중요한 테스트 누락
- suggestion: 선택적 리팩터링, 가독성, 중복 제거, 네이밍 개선

검토 항목: TypeScript 타입 안정성, React Hooks, stale closure, 불필요한 렌더링, Redux Toolkit,
RTK Query 캐시와 invalidation, 비동기 처리, race condition, null 및 undefined 처리, 오류 처리,
보안, 성능, 테스트 누락.`,
    en: `You are a senior code reviewer who is rigorous without inventing unnecessary criticism.
Review only issues that can be verified in the provided Git diff.
Write every explanation in English.
Return only the specified JSON structure.

Review principles:
- Prioritize issues that are likely to cause real bugs.
- Do not flag matters of taste or style alone.
- Do not assert anything that cannot be verified from the diff.
- Lower confidence when an issue involves inference.
- Return an empty issues array when there are no issues.
- Do not manufacture findings to fill a quota.
- Do not flag unchanged code by itself.
- Do not invent file names that are absent from the diff.
- Every finding must include line.
- line and endLine must use actual post-change line numbers from the +++ file.
- Attach feedback to added or changed lines in the diff.
- Do not create multiple findings for the same root cause.
- Do not rewrite the entire codebase.

Severity:
- must_fix: runtime errors, incorrect business logic, data loss, security vulnerabilities, race conditions, or critical performance issues
- should_fix: state synchronization errors, React Hook dependency errors, type-safety issues, missing error handling, important maintainability issues, or missing important tests
- suggestion: optional refactoring, readability, deduplication, or naming improvements

Review areas: TypeScript type safety, React Hooks, stale closures, unnecessary rendering, Redux Toolkit,
RTK Query caching and invalidation, asynchronous behavior, race conditions, null and undefined handling,
error handling, security, performance, and missing tests.`,
  },
  'prompt.user': {
    'ko-KR': `다음 변경사항을 리뷰하고 지정된 JSON 스키마만 반환하세요.

Repository: {repository}
Base branch: {baseBranch}
Mode: {mode}
Commit SHA: {commitSha}
Project context:
{projectContext}
Reviewed files:
{reviewedFiles}

Filtered diff:
{diff}`,
    en: `Review the following changes and return only the specified JSON schema.

Repository: {repository}
Base branch: {baseBranch}
Mode: {mode}
Commit SHA: {commitSha}
Project context:
{projectContext}
Reviewed files:
{reviewedFiles}

Filtered diff:
{diff}`,
  },
  'prompt.none': { 'ko-KR': '(없음)', en: '(none)' },
  'cli.reviewComplete': { 'ko-KR': '리뷰 생성 완료', en: 'Review complete' },
  'cli.verdictLabel': { 'ko-KR': '  판정          ', en: '  Verdict       ' },
  'cli.filesLabel': { 'ko-KR': '  검토 파일     ', en: '  Files reviewed ' },
  'cli.itemsLabel': { 'ko-KR': '  리뷰 항목     ', en: '  Review items   ' },
  'cli.elapsedLabel': { 'ko-KR': '  처리 시간     ', en: '  Elapsed        ' },
  'cli.count': { 'ko-KR': '{count}개', en: '{count}' },
  'cli.openedHtml': {
    'ko-KR': '  브라우저에서 HTML 리포트를 열었습니다.',
    en: '  Opened the HTML report in your browser.',
  },
  'cli.configRequired': {
    'ko-KR': 'Codivew 설정이 필요합니다. codivew setup 또는 codivew config set 명령을 실행하세요.',
    en: 'Codivew requires configuration. Run codivew setup or codivew config set.',
  },
  'cli.reviewing': {
    'ko-KR': 'Codivew Engine 리뷰 생성 중...',
    en: 'Codivew Engine is reviewing...',
  },
  'cli.reviewingShort': { 'ko-KR': '리뷰 생성 중...', en: 'is reviewing...' },
  'cli.verdict.approve': { 'ko-KR': '승인', en: 'Approve' },
  'cli.verdict.comment': { 'ko-KR': '확인 필요', en: 'Comment' },
  'cli.verdict.requestChanges': { 'ko-KR': '수정 필요', en: 'Request changes' },
  'cli.invalidConfig': { 'ko-KR': '✗ 설정값이 올바르지 않습니다:', en: '✗ Invalid configuration:' },
  'cli.validationFailed': { 'ko-KR': '검증 실패', en: 'Validation failed' },
  'cli.unexpectedError': {
    'ko-KR': '✗ 예상하지 못한 오류가 발생했습니다:',
    en: '✗ An unexpected error occurred:',
  },
  'cli.help': {
    'ko-KR': `{usageLabel} {command} {modeSpec} {optionSpec}

Codivew Engine으로 로컬 Git diff를 리뷰하고 HTML 또는 JSON 리포트를 생성합니다.

{commandsHeading}
  setup                 언어, Ollama 연결과 모델을 대화형으로 설정
  config show           저장된 사용자 설정 표시
  config set <key> <v>  ollama-url, model 또는 language 설정

{modesHeading}
  working               작업 트리 변경사항 리뷰 (기본값)
  staged                스테이징된 변경사항 리뷰
  branch                기준 브랜치와 HEAD 사이 변경사항 리뷰

{optionsHeading}
  -b, --base <branch>    branch 모드 기준 브랜치 (기본값: main)
  -c, --context <text>   프로젝트 설명 추가, 여러 번 사용 가능
  -o, --output <path>    결과 파일의 기본 경로
      --format <format>  html, json, both 중 선택 (기본값: html)
      --no-open          브라우저를 열지 않기
      --no-update-notifier 업데이트 알림을 이번 실행에서 끄기
      --ollama-url <url> 이번 실행에서 사용할 Ollama URL
      --model <name>     이번 실행에서 사용할 모델
  -h, --help             도움말 표시
  -v, --version          버전 표시

`,
    en: `{usageLabel} {command} {modeSpec} {optionSpec}

Review local Git changes with Codivew Engine and generate HTML or JSON reports.

{commandsHeading}
  setup                 Configure language, Ollama, and model interactively
  config show           Show the saved configuration
  config set <key> <v>  Set ollama-url, model, or language

{modesHeading}
  working               Review working tree changes (default)
  staged                Review staged changes
  branch                Review changes between the base branch and HEAD

{optionsHeading}
  -b, --base <branch>    Base branch for branch mode (default: main)
  -c, --context <text>   Add project context, repeatable
  -o, --output <path>    Base path for output files
      --format <format>  html, json, or both (default: html)
      --no-open          Do not open the HTML report in a browser
      --no-update-notifier Disable the update notification for this run
      --ollama-url <url> Ollama URL for this run
      --model <name>     Model for this run
  -h, --help             Show help
  -v, --version          Show version

`,
  },
  'report.verdict.approve': { 'ko-KR': '승인', en: 'Approve' },
  'report.verdict.comment': { 'ko-KR': '확인 필요', en: 'Comment' },
  'report.verdict.requestChanges': { 'ko-KR': '수정 필요', en: 'Request changes' },
  'report.risk.low': { 'ko-KR': '낮음', en: 'Low' },
  'report.risk.medium': { 'ko-KR': '보통', en: 'Medium' },
  'report.risk.high': { 'ko-KR': '높음', en: 'High' },
  'report.mode.working': { 'ko-KR': '작업 트리', en: 'Working tree' },
  'report.mode.staged': { 'ko-KR': '스테이징', en: 'Staged' },
  'report.mode.branch': { 'ko-KR': '브랜치 비교', en: 'Branch comparison' },
  'report.filesReviewed': { 'ko-KR': '검토 파일 {count}개', en: '{count} files reviewed' },
  'report.riskLabel': { 'ko-KR': '위험도', en: 'Risk' },
  'report.reviewItems': { 'ko-KR': '리뷰 항목', en: 'Review items' },
  'report.changedCode': { 'ko-KR': '변경 코드', en: 'Changed code' },
  'report.recommendedTests': { 'ko-KR': '권장 테스트', en: 'Recommended tests' },
  'report.reviewSummary': { 'ko-KR': '리뷰 요약', en: 'Review summary' },
  'report.issueStatus': { 'ko-KR': '이슈 현황', en: 'Issue status' },
  'report.severity.mustFix': { 'ko-KR': '필수 수정', en: 'Must fix' },
  'report.severity.shouldFix': { 'ko-KR': '수정 권장', en: 'Should fix' },
  'report.severity.suggestion': { 'ko-KR': '제안', en: 'Suggestion' },
  'report.changeDetails': { 'ko-KR': '변경 정보', en: 'Change details' },
  'report.reviewId': { 'ko-KR': '리뷰 ID', en: 'Review ID' },
  'report.baseBranch': { 'ko-KR': '기준 브랜치', en: 'Base branch' },
  'report.commitSha': { 'ko-KR': '커밋 SHA', en: 'Commit SHA' },
  'report.model': { 'ko-KR': '모델', en: 'Model' },
  'report.noRecommendedTests': { 'ko-KR': '권장 테스트가 없습니다.', en: 'No recommended tests.' },
  'report.generationDetails': { 'ko-KR': '생성 정보', en: 'Generation details' },
  'report.createdAt': { 'ko-KR': '생성 시각', en: 'Created at' },
  'report.elapsed': { 'ko-KR': '처리 시간', en: 'Elapsed' },
  'report.reviewScope': { 'ko-KR': '검토 범위', en: 'Review scope' },
  'report.fileCount': { 'ko-KR': '{count}개 파일', en: '{count} files' },
  'report.noIssuesDescription': {
    'ko-KR': '검토 범위에서 차단 또는 개선 항목이 확인되지 않았습니다.',
    en: 'No blocking or improvement items were found in the review scope.',
  },
  'report.noIssues': { 'ko-KR': '발견된 문제가 없습니다.', en: 'No issues found.' },
  'report.mustFixDescription': {
    'ko-KR': '병합 전에 반드시 해결해야 하는 항목입니다.',
    en: 'These items must be resolved before merging.',
  },
  'report.shouldFixDescription': {
    'ko-KR': '안정성과 유지보수성을 위해 확인을 권장합니다.',
    en: 'Review these items for stability and maintainability.',
  },
  'report.suggestionDescription': {
    'ko-KR': '코드 품질을 더 높일 수 있는 개선 제안입니다.',
    en: 'Optional suggestions that can improve code quality.',
  },
  'report.location': { 'ko-KR': '{file} · {line}번째 줄', en: '{file} · line {line}' },
  'report.confidence': { 'ko-KR': '신뢰도', en: 'Confidence' },
  'report.viewCode': { 'ko-KR': '코드 보기 →', en: 'View code →' },
  'report.description': { 'ko-KR': '설명', en: 'Description' },
  'report.impact': { 'ko-KR': '영향', en: 'Impact' },
  'report.suggestion': { 'ko-KR': '수정 제안', en: 'Suggestion' },
  'report.changedCodeDescription': {
    'ko-KR': '{count}개 파일의 변경사항과 인라인 피드백입니다.',
    en: 'Changes and inline feedback for {count} files.',
  },
  'report.noDiff': { 'ko-KR': '표시할 Diff가 없습니다.', en: 'No diff to display.' },
  'report.changedLines': { 'ko-KR': '변경 {count}줄', en: '{count} changed lines' },
  'report.feedbackCount': { 'ko-KR': '피드백 {count}개', en: '{count} feedback items' },
  'report.expand': { 'ko-KR': '펼치기 ↓', en: 'Expand ↓' },
  'report.collapse': { 'ko-KR': '접기 ↑', en: 'Collapse ↑' },
  'report.noChangedLines': {
    'ko-KR': '텍스트로 표시할 변경 라인이 없습니다.',
    en: 'No changed text lines to display.',
  },
  'report.viewDetails': { 'ko-KR': '상세 보기 ↑', en: 'View details ↑' },
} as const satisfies Record<string, Record<Language, string>>;

export type MessageKey = keyof typeof MESSAGES;
type MessageValues = Record<string, string | number>;

let activeLanguage: Language = 'ko-KR';

export function setLanguage(language: Language): void {
  activeLanguage = language;
}

export function getLanguage(): Language {
  return activeLanguage;
}

export function t(key: MessageKey, values: MessageValues = {}): string {
  return translate(activeLanguage, key, values);
}

export function translate(language: Language, key: MessageKey, values: MessageValues = {}): string {
  const template: string = MESSAGES[key][language];
  return template.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (placeholder, name: string) => {
    const value = values[name];
    return value === undefined ? placeholder : String(value);
  });
}

export function parseLanguage(value: string): Language | undefined {
  if (value === 'ko-KR' || value === 'en') return value;
  return undefined;
}
