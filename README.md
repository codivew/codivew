# AI Code Review Server

Git diff를 Ollama 코딩 모델로 검토하고, 브라우저에서 열 수 있는 독립 실행형 HTML 리뷰의 짧은 공개 URL을 반환하는 NestJS 서버입니다.

- NestJS + Fastify
- Bearer 토큰 인증
- DTO와 환경변수 검증
- lockfile, 빌드 산출물, 민감 파일 diff 제외
- Ollama structured output + Zod 후처리 검증
- 외부 CSS, JavaScript, 폰트가 없는 HTML 결과물
- `PUBLIC_URL/<12자리 ID>` 공개 URL
- 메모리 저장 및 TTL 만료
- Swagger, PM2, Docker 지원

별도 프런트엔드, 데이터베이스, 영구 리뷰 이력, GitHub/GitLab 연동은 포함하지 않습니다.

## 처리 흐름

```text
POST /api/reviews
  → ApiTokenGuard
  → ValidationPipe
  → DiffFilterService
  → ReviewPromptService
  → OllamaService (/api/chat)
  → ReviewResult Zod 검증
      └─ 실패 시 원문 없이 사유만 전달해 1회 재요청
  → HtmlRendererService
  → ReviewStoreService (메모리 + TTL)
  → PUBLIC_URL/<short-id> 문자열 반환

GET /result/<short-id>
  → 저장된 HTML 결과물 표시
```

Ollama에는 구조, 타입, enum 중심의 호환 가능한 JSON Schema를 전달합니다. 문자열 길이, 배열 개수, 숫자 범위, 파일명과 라인 관계 같은 상세 제약은 서버가 Zod로 검증합니다.

## 요구사항

- Node.js 22 이상
- npm 10 이상
- 별도로 실행 중인 Ollama
- `review.sh` 사용 시 `git`, `curl`, `jq`

## 설치

```bash
npm install
cp .env.example .env
```

## 환경변수

| 이름                      | 기본값                         | 설명                                   |
| ------------------------- | ------------------------------ | -------------------------------------- |
| `NODE_ENV`                | `development`                  | `development`, `test`, `production`    |
| `PORT`                    | `3000`                         | 서버 포트, 1~65535                     |
| `REVIEW_API_TOKEN`        | 빈 문자열                      | API Bearer 토큰. production에서는 필수 |
| `PUBLIC_URL`              | `http://localhost:3000/result` | 공개 결과물 URL의 기본 경로            |
| `OLLAMA_BASE_URL`         | `http://localhost:11434`       | Ollama 기본 URL                        |
| `OLLAMA_MODEL`            | `qwen3.6:35b-a3b-coding-mxfp8` | 리뷰에 사용할 모델                     |
| `OLLAMA_TIMEOUT_MS`       | `600000`                       | Ollama 리뷰 요청 제한 시간             |
| `REVIEW_MAX_DIFF_CHARS`   | `120000`                       | 필터링 후 diff 최대 문자 수            |
| `REVIEW_RESULT_TTL_MS`    | `86400000`                     | 결과물 유지 시간. 기본 24시간          |
| `REVIEW_BODY_LIMIT_BYTES` | `524288`                       | HTTP 요청 본문 최대 바이트 수          |

환경변수는 시작 시 Zod로 검증됩니다. production에서 토큰이 없거나 URL과 숫자 범위가 잘못되면 시작에 실패합니다. `PUBLIC_URL`은 클라이언트가 실제로 접근할 수 있는 `/result` 공개 주소로 설정해야 합니다.

예시:

```env
NODE_ENV=production
PORT=3000
REVIEW_API_TOKEN=replace-with-a-strong-token
PUBLIC_URL=https://review.example.com/result
OLLAMA_BASE_URL=https://ollama.example.com
OLLAMA_MODEL=qwen3.6:35b-a3b-mtp-q8_0
OLLAMA_TIMEOUT_MS=600000
REVIEW_MAX_DIFF_CHARS=120000
REVIEW_RESULT_TTL_MS=86400000
REVIEW_BODY_LIMIT_BYTES=524288
```

## 서버 실행

개발 모드:

```bash
npm run start:dev
```

일반 production 실행:

```bash
npm run build
NODE_ENV=production npm start
```

`.env`는 애플리케이션 생성 전에 로드되므로 PM2와 production 실행에서도 동일하게 적용됩니다.

## PM2

PM2 시작 명령은 먼저 production build를 수행합니다.

```bash
npm run pm2:start
```

관리 명령:

```bash
npm run pm2:status
npm run pm2:logs
npm run pm2:restart
npm run pm2:stop
npm run pm2:delete
```

코드 또는 `.env` 변경 후에는 다음 명령으로 다시 빌드하고 환경변수까지 갱신합니다.

```bash
npm run pm2:restart
```

재부팅 후 자동 실행:

```bash
npx pm2 startup
# PM2가 출력한 운영체제별 명령 실행
npx pm2 save
```

결과물이 프로세스 메모리에 있으므로 [ecosystem.config.cjs](./ecosystem.config.cjs)는 `instances: 1`, `exec_mode: fork`로 고정되어 있습니다. PM2 재시작 시 기존 결과물은 TTL과 관계없이 사라집니다.

## API

| Method | Path                | 인증        | 응답                      |
| ------ | ------------------- | ----------- | ------------------------- |
| `POST` | `/api/reviews`      | Bearer 토큰 | `201 text/plain` 공개 URL |
| `GET`  | `/result/:reviewId` | 없음        | HTML 리뷰 또는 404        |
| `GET`  | `/api/health`       | 없음        | 프로세스 상태             |
| `GET`  | `/api/ready`        | 없음        | Ollama 연결 상태          |
| `GET`  | `/api/docs`         | 없음        | Swagger UI                |
| `GET`  | `/api/docs-json`    | 없음        | OpenAPI JSON              |

### 리뷰 요청

```http
POST /api/reviews
Authorization: Bearer dev-token
Content-Type: application/json
Accept: text/plain
```

```json
{
  "repository": "my-project",
  "baseBranch": "main",
  "mode": "staged",
  "commitSha": "abc1234",
  "projectContext": ["NestJS API", "Redis를 사용하지 않음"],
  "diff": "diff --git a/src/app.ts b/src/app.ts\n..."
}
```

요청 필드:

| 필드             | 필수   | 제약                             |
| ---------------- | ------ | -------------------------------- |
| `repository`     | 예     | 1~100자                          |
| `baseBranch`     | 아니요 | 최대 200자                       |
| `mode`           | 예     | `staged`, `working`, `branch`    |
| `commitSha`      | 아니요 | 최대 100자                       |
| `projectContext` | 아니요 | 최대 20개, 항목당 최대 100자     |
| `diff`           | 예     | 비어 있지 않은 `diff --git` 형식 |

성공 응답 본문에는 URL 문자열만 들어갑니다.

```text
https://review.example.com/result/K4n2sP9_xQ7m
```

`X-Review-Id`와 `Location` 헤더에도 각각 결과 ID와 공개 URL이 포함됩니다. 공개 URL은 인증 없이 접근할 수 있으며 `REVIEW_RESULT_TTL_MS`가 지나거나 프로세스가 재시작되면 404를 반환합니다.

수동 curl 요청:

```bash
curl \
  --fail-with-body \
  --request POST \
  'http://localhost:3000/api/reviews' \
  --header 'Authorization: Bearer dev-token' \
  --header 'Content-Type: application/json' \
  --header 'Accept: text/plain' \
  --data-binary @review-request.json
```

오류는 HTML이 아닌 공통 JSON 형식입니다.

```json
{
  "error": {
    "code": "OLLAMA_UNAVAILABLE",
    "message": "AI 리뷰 서비스에 연결할 수 없습니다."
  }
}
```

오류 코드:

| 코드                     | HTTP 상태                   |
| ------------------------ | --------------------------- |
| `UNAUTHORIZED`           | 401                         |
| `INVALID_REQUEST`        | 400, 결과 URL 미존재 시 404 |
| `EMPTY_DIFF`             | 400                         |
| `DIFF_TOO_LARGE`         | 413                         |
| `OLLAMA_UNAVAILABLE`     | 503                         |
| `MODEL_RESPONSE_INVALID` | 502                         |
| `INTERNAL_ERROR`         | 500                         |

## `review.sh` 사용

스크립트는 저장소 정보와 Git diff를 만들고 리뷰 API에 전송한 뒤, 진행 스피너와 경과 시간, 결과 URL을 출력합니다.

```text
Usage: ./review.sh [staged|working|branch] [--open]
```

모드:

| 모드      | 생성하는 diff                                     |
| --------- | ------------------------------------------------- |
| `staged`  | `git diff --cached`, `git add`된 변경             |
| `working` | `git diff`, staged되지 않은 tracked 변경          |
| `branch`  | `git diff BASE_BRANCH...HEAD`, 커밋된 브랜치 변경 |

인자를 생략하면 `staged`가 사용됩니다.

```bash
./review.sh
./review.sh staged
./review.sh working
BASE_BRANCH=develop ./review.sh branch
```

리뷰가 완료된 뒤 브라우저에서 자동으로 열기:

```bash
./review.sh working --open
```

다른 서버와 토큰 사용:

```bash
REVIEW_API_URL=https://review.example.com \
REVIEW_API_TOKEN=replace-with-a-strong-token \
./review.sh staged
```

`REVIEW_API_URL`에는 `/api/reviews`가 아니라 서버 기본 주소만 입력합니다. 스크립트가 `/api/reviews`를 붙입니다.

```text
AI Code Review
────────────────────────────────────────
  Repository     my-project
  Mode           staged
  Base branch    main
  Commit         abc1234
  Changed files  4
  Diff size      12840 bytes
  Endpoint       https://review.example.com/api/reviews
────────────────────────────────────────

  | AI 리뷰 생성 중... 18s
```

정확한 퍼센트 진행률은 Ollama가 중간 진행 정보를 제공하지 않아 표시하지 않으며, 대신 스피너와 경과 시간을 표시합니다.

## Diff 필터

서버는 단순 문자열이 아니라 파일별 `diff --git` 블록 전체를 제거합니다.

제외 대상:

- `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, `bun.lockb`
- `*.min.js`, `*.map`
- `dist/**`, `build/**`, `coverage/**`, `.next/**`, `generated/**`
- `.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa`, `id_ed25519`

`.env.example`과 `.env.sample`은 허용합니다. 모든 블록이 제외되면 `EMPTY_DIFF`를 반환하고, 필터링된 diff가 최대 크기를 넘으면 자르지 않고 `DIFF_TOO_LARGE`를 반환합니다.

## 결과물 저장과 만료

- 디스크나 데이터베이스에 저장하지 않습니다.
- 프로세스 메모리에 최근 1,000건만 보관합니다.
- 기본 TTL은 24시간이며 `REVIEW_RESULT_TTL_MS`로 변경할 수 있습니다.
- 만료된 결과는 404를 반환하고 메모리에서도 제거됩니다.
- 재시작, 재배포, PM2 restart 시 모든 결과가 사라집니다.
- 여러 서버 인스턴스 사이에 결과가 공유되지 않습니다.

## 로깅과 보안

로그에 허용되는 주요 값:

- request ID, review ID
- repository, mode, 모델명
- 원본/필터링 파일 수와 문자 수
- Ollama 및 전체 처리 시간
- HTTP 상태, verdict, issue 개수

로그에 남기지 않는 값:

- Authorization 헤더와 API 토큰
- 전체 요청 본문과 diff
- Ollama 원문 응답
- code snippet과 민감 파일 내용
- 내부 Ollama URL

Ollama 오류 로그는 `network_error`, `timeout`, `http_error`, `response_body_read_failed`, `model_response_invalid`를 구분합니다. HTTP 오류에는 안전하게 상태 코드만 기록합니다.

토큰은 `crypto.timingSafeEqual`로 비교합니다. HTML에는 사용자 입력과 모델 출력을 raw로 삽입하지 않고 `&`, `<`, `>`, `"`, `'`를 escape합니다. 결과 응답에는 CSP, `nosniff`, `no-referrer`, `no-store` 헤더를 적용합니다.

공개 결과 URL에는 인증이 필요하지 않습니다. URL을 아는 사람은 TTL 동안 리뷰를 볼 수 있으므로 URL과 리뷰 내용을 민감 정보로 취급해야 합니다.

## Health와 readiness

```bash
curl http://localhost:3000/api/health
curl --fail-with-body http://localhost:3000/api/ready
```

`health`는 `{ "status": "ok" }`를 반환합니다. `ready`는 5초 제한으로 Ollama `/api/tags`를 확인하며, 연결할 수 없으면 503과 `{ "status": "not_ready", "ollama": "unavailable" }`을 반환합니다.

## Docker

Ollama 컨테이너는 포함하지 않습니다.

```bash
export REVIEW_API_TOKEN='replace-with-a-strong-token'
export PUBLIC_URL='http://localhost:3000/result'
export OLLAMA_BASE_URL='http://host.docker.internal:11434'
docker compose up --build
```

Docker 이미지는 Node.js 22 멀티스테이지 빌드이며 production 의존성만 포함하고 non-root 사용자로 실행됩니다. Linux에서도 호스트 Ollama에 접근할 수 있도록 `host.docker.internal:host-gateway`가 설정되어 있습니다.

## 품질 확인

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

테스트에서는 실제 Ollama를 호출하지 않고 provider를 override합니다.

## 알려진 제한사항

- 표준 `diff --git` 형식만 지원합니다.
- `review.sh working`은 untracked 파일을 포함하지 않습니다.
- 단일 요청의 diff를 자동 분할하거나 요약하지 않습니다.
- 모델 응답 검증 재시도는 한 번뿐입니다.
- 결과 저장소는 단일 프로세스 메모리이므로 수평 확장과 무중단 cluster reload에 적합하지 않습니다.
- 공개 결과 URL의 별도 접근 인증은 제공하지 않습니다.
- GitHub/GitLab API, PR/MR 댓글, 자동 수정, SARIF, 다중 모델, 사용자 계정은 지원하지 않습니다.
