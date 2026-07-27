# AI Code Review Server

Git diff와 프로젝트 정보를 받아 로컬 Ollama 모델로 리뷰한 뒤, 외부 리소스가 없는 UUID HTML 결과물의 공개 URL을 반환하는 NestJS 서버입니다. CLI, 프런트엔드, 데이터베이스 및 영구 리뷰 이력 저장은 포함하지 않습니다.

## 아키텍처

```text
POST /api/reviews
  → Bearer ApiTokenGuard
  → DTO ValidationPipe
  → DiffFilterService (제외/민감 파일 블록 제거)
  → ReviewPromptService
  → OllamaService (/api/chat, JSON Schema)
  → ReviewResult Zod 검증 (실패 시 1회 재요청)
  → HtmlRendererService
  → 메모리에 최근 결과 보관
  → PUBLIC_URL/<UUID>.html 문자열 응답
```

NestJS는 Guard, ValidationPipe, Filter와 모듈 경계를 일관되게 제공하고, Fastify는 작은 런타임 오버헤드와 명시적인 body limit를 제공하므로 선택했습니다. 생성한 HTML은 디스크에 저장하지 않고 프로세스 메모리에 최근 1,000건만 보관합니다.

## 요구사항 및 설치

- Node.js 22 이상
- npm 10 이상
- 별도로 실행 중인 Ollama와 설정한 모델

```bash
npm install
cp .env.example .env
```

환경변수:

| 이름                      | 기본값                              | 설명                                |
| ------------------------- | ----------------------------------- | ----------------------------------- |
| `NODE_ENV`                | `development`                       | `development`, `test`, `production` |
| `PORT`                    | `3000`                              | 서버 포트(1~65535)                  |
| `REVIEW_API_TOKEN`        | 빈 문자열                           | Bearer 토큰. production에서는 필수  |
| `PUBLIC_URL`              | `http://localhost:3000/api/reviews` | 공개 결과물 URL의 기본 경로         |
| `OLLAMA_BASE_URL`         | `http://localhost:11434`            | Ollama 기본 URL                     |
| `OLLAMA_MODEL`            | `qwen3.6:35b-a3b-coding-mxfp8`      | 리뷰 모델                           |
| `OLLAMA_TIMEOUT_MS`       | `180000`                            | 모델 호출 제한 시간                 |
| `REVIEW_MAX_DIFF_CHARS`   | `120000`                            | 필터링 후 diff 최대 문자 수         |
| `REVIEW_RESULT_TTL_MS`    | `86400000`                          | 생성 결과물 유지 시간(밀리초)       |
| `REVIEW_BODY_LIMIT_BYTES` | `524288`                            | HTTP 요청 본문 최대 바이트 수       |

환경변수는 시작 시 Zod로 검증됩니다. production에서 토큰이 없거나 URL·숫자 범위가 잘못되면 서버가 시작되지 않습니다.

## 실행

개발:

```bash
REVIEW_API_TOKEN=dev-token \
PUBLIC_URL=http://localhost:3000/api/reviews \
OLLAMA_BASE_URL=http://localhost:11434 \
OLLAMA_MODEL=qwen3.6:35b-a3b-coding-mxfp8 \
npm run start:dev
```

프로덕션:

```bash
npm run build
NODE_ENV=production REVIEW_API_TOKEN='strong-secret' npm start
```

상태 확인:

```bash
curl http://localhost:3000/api/health
curl --fail-with-body http://localhost:3000/api/ready
```

`health`는 프로세스 상태만 확인합니다. `ready`는 5초 제한으로 Ollama의 `/api/tags`를 호출하며 연결할 수 없으면 503을 반환합니다. 두 경로에는 인증이 필요하지 않습니다.

Swagger UI는 서버 실행 후 `http://localhost:3000/api/docs`에서 확인할 수 있습니다. 리뷰 API의 `Authorize` 버튼에는 `REVIEW_API_TOKEN` 값만 입력합니다. OpenAPI JSON은 `/api/docs-json`에서 제공됩니다.

## 리뷰 요청

`POST /api/reviews`에 다음 JSON을 전송합니다.

```json
{
  "repository": "my-project",
  "baseBranch": "main",
  "mode": "staged",
  "commitSha": "abc1234",
  "projectContext": ["NestJS API", "PostgreSQL을 사용하지 않음"],
  "diff": "diff --git a/src/app.ts b/src/app.ts\n..."
}
```

- `mode`: `working`, `staged`, `branch` 중 하나
- `baseBranch`, `commitSha`, `projectContext`: 선택 사항
- 알 수 없는 필드는 거부됩니다.
- 오류는 항상 `{ "error": { "code", "message", "details?" } }` JSON입니다.
- 성공 응답은 `text/plain`이며 본문에는 `PUBLIC_URL/<UUID>.html` URL만 들어갑니다.

staged diff 요청 파일 생성:

```bash
DIFF="$(git diff --cached --unified=5 --diff-filter=ACMRT)"
jq -n \
  --arg repository "$(basename "$(git rev-parse --show-toplevel)")" \
  --arg mode "staged" \
  --arg diff "$DIFF" \
  '{ repository: $repository, mode: $mode, diff: $diff }' \
  > review-request.json
```

리뷰를 생성하고 공개 URL 받기:

```bash
curl \
  --fail-with-body \
  -X POST \
  "http://localhost:3000/api/reviews" \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -H "Accept: text/plain" \
  --data-binary @review-request.json
```

응답 예시:

```text
https://reviews.example.com/api/reviews/550e8400-e29b-41d4-a716-446655440000.html
```

`PUBLIC_URL`은 외부에서 실제 `/api/reviews` 경로에 접근할 수 있는 주소로 설정해야 합니다. 반환된 URL의 GET 요청에는 API 토큰이 필요하지 않습니다. 결과물은 `REVIEW_RESULT_TTL_MS`가 지나면 만료되어 404를 반환하며 기본 유지 시간은 하루입니다. HTML은 CSS까지 내장되어 브라우저에서 열고 인쇄할 수 있습니다.

## Diff 필터와 보안

lockfile, 빌드 산출물, source map, minified JS 및 `.env`, 개인 키·인증서 파일은 해당 파일의 전체 `diff --git` 블록 단위로 제거됩니다. `.env.example`과 `.env.sample`은 유지됩니다. 모든 블록이 제거되면 `EMPTY_DIFF`를 반환하며 diff를 자동으로 잘라내지는 않습니다.

Bearer 토큰은 `timingSafeEqual`로 비교합니다. 토큰, Authorization 헤더, 요청 본문, diff, 모델 원문, 코드 스니펫은 로그에 기록하지 않습니다. 모델과 사용자 문자열은 `& < > " '`를 HTML escape하고, 결과물 응답에는 CSP, `nosniff`, `no-referrer`, `no-store` 헤더를 적용합니다. 공개 URL을 아는 사용자는 인증 없이 결과물을 볼 수 있으므로 URL과 리뷰 내용을 민감 정보로 취급해야 합니다.

## Docker

Ollama는 Compose에 포함하지 않으며 호스트 또는 별도 서버를 사용합니다.

```bash
export REVIEW_API_TOKEN='strong-secret'
export OLLAMA_BASE_URL='http://host.docker.internal:11434'
docker compose up --build
```

이미지는 Node.js 22 멀티스테이지 빌드이며 최종 단계는 production 의존성만 포함하고 non-root 사용자로 실행됩니다. Linux에서 `host.docker.internal`을 사용할 수 있도록 `extra_hosts`가 설정되어 있습니다.

## 품질 확인

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

단위 테스트는 인증, diff 필터, 모델 스키마, Ollama 오류 처리, 재시도 및 HTML escape를 검증합니다. E2E 테스트에서는 실제 Ollama 대신 provider를 override합니다.

## 알려진 제한사항

- 표준 `diff --git` 형식만 입력으로 지원합니다. Git 바이너리 diff 내용 자체는 분석하지 않습니다.
- 단일 요청에서 모델 컨텍스트 한도를 넘는 diff를 분할하거나 요약하지 않습니다.
- 모델 검증 실패 재시도는 한 번뿐입니다.
- 결과물은 설정된 TTL 동안 프로세스 메모리에 최근 1,000건만 유지되며 재시작 또는 새 배포 시에도 사라집니다. 여러 서버 인스턴스 사이에는 공유되지 않습니다.
- GitHub/GitLab API, PR/MR 댓글, 자동 수정, SARIF, 다중 모델 및 사용자 계정은 지원하지 않습니다.
