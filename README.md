# Codivew

Codivew는 Git 변경사항을 로컬 Ollama 코딩 모델로 검토하고 독립 실행형 HTML 리포트를 만드는 CLI입니다. 별도 서버, 토큰, 데이터베이스가 필요하지 않습니다.

- 브랜드명: **Codivew**
- 엔진명: **Codivew Engine**
- CLI 명령어: `codivew`
- npm 패키지: `codivew`

## 주요 기능

- working tree, staged 변경사항, 브랜치 간 diff 리뷰
- lockfile, 빌드 산출물, 민감 파일 diff 자동 제외
- Ollama structured output과 Zod 후처리 검증
- 검증 실패 시 사유만 전달해 1회 재요청
- 파일별 unified diff와 변경 라인별 AI 피드백 표시
- 외부 CSS, JavaScript, 폰트가 없는 단일 HTML 결과물
- macOS, Linux, Windows 지원

## 요구사항

- Node.js 18 이상
- npm 10 이상
- Git
- 로컬 또는 접근 가능한 Ollama

Ollama에 사용할 모델을 먼저 준비합니다.

```bash
ollama pull qwen3.6:35b-a3b-coding-mxfp8
```

## 설치

```bash
npm install -g codivew
codivew setup
codivew staged
```

`codivew setup`은 Ollama URL에 연결해 설치된 모델을 조회하고, 선택한 설정을 사용자 설정 파일에 저장합니다.

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

업데이트:

```bash
npm install -g codivew@latest
```

## 소스에서 개발

```bash
npm install
npm run build
npm link
```

이후 어느 Git 저장소에서든 `codivew` 명령을 사용할 수 있습니다.

## 사용법

```bash
# 현재 작업 트리 변경사항
codivew
codivew working

# git add로 스테이징한 변경사항
codivew staged

# main과 현재 HEAD 사이 변경사항
codivew branch

# 다른 기준 브랜치 사용
codivew branch --base develop

# 결과 파일 지정
codivew staged --output ./codivew-review.html

# 결과 생성 후 브라우저를 열지 않기
codivew staged --silent

# 모델에 프로젝트 문맥 전달
codivew --context "NestJS API" --context "Redis를 사용하지 않음"

# 설정 확인 및 변경
codivew config show
codivew config set ollama-url http://localhost:11434
codivew config set model qwen3.6:35b-a3b-coding-mxfp8

# 이번 실행에만 다른 설정 사용
codivew --ollama-url http://ollama.example.com:11434 --model qwen3.6:35b-a3b-coding-mxfp8
```

기본 결과 파일은 `codivew`를 실행한 현재 디렉터리의 `.codivew/` 아래에 `codivew-YYYYMMDD-HHmmss.html` 형식으로 저장되고 브라우저에서 자동으로 열립니다. 같은 초에 생성된 파일이 있으면 `-001`과 같은 순번이 추가됩니다. 생성된 결과를 Git에서 제외하려면 프로젝트의 `.gitignore`에 `.codivew/`를 추가하세요. `--output`을 지정하면 원하는 위치에 보관할 수 있고, `--silent`를 사용하면 브라우저를 열지 않습니다.

전체 옵션:

```text
Usage: codivew [working|staged|branch] [options]

Commands:
  setup                 Ollama 연결과 모델을 대화형으로 설정
  config show           저장된 사용자 설정 표시
  config set <key> <v>  ollama-url 또는 model 설정

Options:
  -b, --base <branch>    branch 모드 기준 브랜치 (기본값: main)
  -c, --context <text>   프로젝트 설명 추가, 여러 번 사용 가능
  -o, --output <path>    HTML 결과 파일 경로
      --silent           브라우저를 열지 않기
      --ollama-url <url> 이번 실행에서 사용할 Ollama URL
      --model <name>     이번 실행에서 사용할 모델
  -h, --help             도움말 표시
  -v, --version          버전 표시
```

## 환경변수

| 이름                    | 기본값                         | 설명                        |
| ----------------------- | ------------------------------ | --------------------------- |
| `OLLAMA_BASE_URL`       | `http://localhost:11434`       | Ollama API 주소             |
| `OLLAMA_MODEL`          | `qwen3.6:35b-a3b-coding-mxfp8` | 리뷰에 사용할 모델          |
| `OLLAMA_TIMEOUT_MS`     | `600000`                       | Ollama 요청 제한 시간       |
| `REVIEW_MAX_DIFF_CHARS` | `120000`                       | 필터링 후 diff 최대 문자 수 |

CLI는 현재 작업 디렉터리에서 상위로 올라가며 Git 저장소 루트를 찾습니다.

설정 적용 우선순위는 CLI 옵션 → 환경변수 → 사용자 설정 파일 → 기본값입니다. 사용자 설정이 없으면 대화형 터미널에서는 최초 리뷰 실행 시 `codivew setup`이 자동으로 시작됩니다. 비대화형 환경에서는 CLI 옵션이나 환경변수로 Ollama URL과 모델을 모두 제공해야 합니다.

## 처리 흐름

```text
Codivew CLI
  → Git diff 생성
  → 제외 대상 파일 필터링
  → Codivew Engine 리뷰 프롬프트 생성
  → POST /api/chat
  → Zod 결과 검증
      └─ 실패 시 검증 사유와 함께 1회 재요청
  → 독립 실행형 HTML 렌더링
  → 로컬 파일 저장
```

## 개발

```bash
npm run dev -- --help
npm run check
npm run format:check
npm run build
```
