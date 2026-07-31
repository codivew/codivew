# Codivew

[![npm version](https://img.shields.io/npm/v/codivew.svg)](https://www.npmjs.com/package/codivew)
[![npm downloads](https://img.shields.io/npm/dm/codivew.svg)](https://www.npmjs.com/package/codivew)
[![license](https://img.shields.io/npm/l/codivew.svg)](https://github.com/knsan189/codivew/blob/main/LICENSE)

Codivew는 Git 변경사항을 Ollama 코딩 모델로 검토하고, 파일별 피드백과 diff가 포함된 독립 실행형 HTML 리포트를 생성하는 CLI입니다. 별도 서버나 데이터베이스 없이 로컬에서 실행됩니다.

- 엔진: **Codivew Engine**
- 명령어: `codivew`
- npm 패키지: `codivew`

## 주요 기능

- working tree, staged 변경사항 및 브랜치 간 diff 리뷰
- 별도 서버 없이 사용자가 선택한 Ollama 모델로 로컬 리뷰
- 리뷰 요약과 파일 및 변경 라인별 피드백 제공
- 긴 변경 코드를 파일별로 접고 펼칠 수 있는 HTML 리포트
- 민감 파일과 리뷰에 불필요한 생성 파일 자동 제외
- 결과 자동 저장 및 브라우저 열기
- macOS, Linux, Windows 지원

## 요구사항

- Node.js 18 이상
- Git
- 로컬 또는 네트워크에서 접근 가능한 Ollama

리뷰에 사용할 모델을 Ollama에 먼저 설치하세요.

```bash
ollama pull qwen3.6:35b-a3b-coding-mxfp8
```

## 설치

```bash
npm install -g codivew
codivew setup
```

업데이트할 때는 최신 버전을 다시 전역 설치합니다.

```bash
npm install -g codivew@latest
```

Codivew는 실행 시 하루에 한 번 `latest` 버전을 확인하고, 새 버전이 있으면 명령 종료 후
업데이트 방법을 안내합니다. 이번 실행에서 확인하지 않으려면 `--no-update-notifier`를
사용하고, 항상 끄려면 `NO_UPDATE_NOTIFIER=1` 환경 변수를 설정합니다.

## 초기 설정

```bash
codivew setup
```

`setup`은 Ollama URL에 연결하여 설치된 모델을 조회하고, 선택한 URL과 모델을 사용자 설정 파일에 저장합니다.

```text
Codivew 초기 설정

Ollama URL (http://localhost:11434):
  ✓ 연결됨 · 모델 2개

사용할 모델:
  1. qwen3.6:35b-a3b-coding-mxfp8
  2. qwen2.5-coder:14b
선택 (1):
```

설정 파일 위치:

| 운영체제 | 경로                                                |
| -------- | --------------------------------------------------- |
| macOS    | `~/Library/Application Support/Codivew/config.json` |
| Linux    | `${XDG_CONFIG_HOME:-~/.config}/codivew/config.json` |
| Windows  | `%APPDATA%\Codivew\config.json`                     |

대화형 터미널에서 설정 없이 리뷰를 처음 실행하면 `setup`이 자동으로 시작됩니다. CI처럼 비대화형으로 실행할 때는 저장된 설정을 준비하거나 `--ollama-url`과 `--model`을 모두 지정해야 합니다.

설정 적용 우선순위는 CLI 옵션 → 사용자 설정 파일 → 기본값입니다.

## 사용법

Codivew는 현재 디렉터리에서 상위로 올라가며 Git 저장소 루트를 찾습니다.

```bash
# unstaged 변경사항과 Git이 아직 추적하지 않는 새 파일
codivew
codivew working

# git add로 staged 상태가 된 변경사항
codivew staged

# main과 현재 HEAD 사이의 변경사항
codivew branch

# 다른 기준 브랜치와 현재 HEAD 비교
codivew branch --base develop
```

리뷰에 프로젝트 문맥을 추가할 수 있습니다. `--context`는 최대 20번까지 사용할 수 있습니다.

```bash
codivew staged \
  --context "Node.js CLI 프로젝트" \
  --context "Node.js 18 이상을 지원해야 함"
```

### 결과 파일

기본 결과 파일은 명령을 실행한 디렉터리의 `.codivew/`에 저장되고 브라우저에서 자동으로 열립니다.

```text
.codivew/
└── codivew-20260728-140509.html
```

같은 초에 파일이 이미 있으면 `codivew-20260728-140509-001.html`처럼 순번을 붙여 기존 결과를 보존합니다. 프로젝트의 `.gitignore`에는 다음 항목을 추가하는 것을 권장합니다.

```gitignore
.codivew/
```

브라우저를 열지 않으려면 `--silent`를 사용합니다.

```bash
codivew staged --silent
```

저장 경로를 직접 지정할 수도 있습니다. `.html` 확장자를 생략하면 자동으로 추가됩니다.

```bash
codivew staged --output ./reports/review.html
```

### 설정 확인 및 변경

```bash
codivew config show
codivew config set ollama-url http://localhost:11434
codivew config set model qwen3.6:35b-a3b-coding-mxfp8
```

저장된 설정을 변경하지 않고 이번 실행에서만 다른 Ollama나 모델을 사용할 수도 있습니다.

```bash
codivew staged \
  --ollama-url http://ollama.example.com:11434 \
  --model qwen3.6:35b-a3b-coding-mxfp8
```

## 리뷰 모드

| 모드      | Git 비교 기준               | 기본값 |
| --------- | --------------------------- | ------ |
| `working` | `git diff` + untracked 파일 | 예     |
| `staged`  | `git diff --cached`         | 아니요 |
| `branch`  | `git diff <base>...HEAD`    | 아니요 |

모든 모드는 rename을 포함한 추가·수정·이름 변경 파일을 대상으로 합니다. `working` 모드는 `.gitignore`에 포함되지 않은 untracked 파일도 리뷰합니다.

## 전체 명령어

```text
Usage: codivew [working|staged|branch] [options]

Commands:
  setup                 Ollama 연결과 모델을 대화형으로 설정
  config show           저장된 사용자 설정 표시
  config set <key> <v>  ollama-url 또는 model 설정

Modes:
  working               작업 트리 변경사항 리뷰 (기본값)
  staged                스테이징된 변경사항 리뷰
  branch                기준 브랜치와 HEAD 사이 변경사항 리뷰

Options:
  -b, --base <branch>    branch 모드 기준 브랜치 (기본값: main)
  -c, --context <text>   프로젝트 설명 추가, 여러 번 사용 가능
  -o, --output <path>    HTML 결과 파일 경로
      --silent           브라우저를 열지 않기
      --no-update-notifier 업데이트 알림을 이번 실행에서 끄기
      --ollama-url <url> 이번 실행에서 사용할 Ollama URL
      --model <name>     이번 실행에서 사용할 모델
  -h, --help             도움말 표시
  -v, --version          버전 표시
```

## 리뷰 대상에서 제외되는 파일

Codivew는 모델에 불필요하거나 민감할 가능성이 높은 diff를 자동으로 제외합니다.

- npm, pnpm, Yarn, Bun lockfile
- `dist`, `build`, `coverage`, `.next`, `generated` 디렉터리
- `.env`, `.env.*`, 개인 키와 인증서 파일
- minified JavaScript와 source map

`.env.example`과 `.env.sample`은 리뷰 대상에 포함됩니다. 제외 후 리뷰할 diff가 남지 않으면 오류로 종료합니다.

## 처리 흐름

```text
Git diff 생성
  → 제외 대상 파일 필터링
  → Codivew Engine 프롬프트 생성
  → Ollama 리뷰 요청 및 결과 검증
  → HTML 리포트 렌더링
  → .codivew/에 저장
  → 브라우저에서 열기
```

## 소스에서 실행

```bash
npm install
npm run dev -- --help
```

전역 명령어처럼 테스트하려면 빌드 후 npm link를 사용합니다.

```bash
npm run build
npm link
codivew --version
```

## 개발 명령어

```bash
npm run typecheck
npm run lint
npm test
npm run format:check
npm run generate:report-style
npm run build
npm run check
```

`generate:report-style`은 리포트 렌더러에서 사용하는 Tailwind 유틸리티만 CSS로
컴파일하고, 최종 HTML의 `<style>`에 삽입할 TypeScript 모듈을 생성합니다. `dev`,
`typecheck`, `test`, `build` 실행 전에는 이 과정이 자동으로 수행됩니다.
리포트 본문은 `src/reporting/review-report.tsx`의 Preact JSX 컴포넌트를 서버에서 문자열로
렌더링하며, 리뷰 데이터는 JSX escaping을 거쳐 출력됩니다.

배포 패키지에 포함될 파일은 다음 명령으로 확인할 수 있습니다.

```bash
npm pack --dry-run
```
