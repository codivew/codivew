# Codivew

[English](../README.md) | 한국어

[![npm version](https://img.shields.io/npm/v/codivew.svg)](https://www.npmjs.com/package/codivew)
[![npm downloads](https://img.shields.io/npm/dm/codivew.svg)](https://www.npmjs.com/package/codivew)
[![license](https://img.shields.io/npm/l/codivew.svg)](https://github.com/knsan189/codivew/blob/main/LICENSE)

Codivew는 OpenAI-compatible API로 Git 변경사항을 검토하고 HTML 또는 기계 판독 가능한 JSON 리포트를 생성합니다. 별도 Codivew 서버나 데이터베이스는 필요하지 않습니다.

## 주요 기능

- working tree, staged 변경사항 및 브랜치 간 diff 리뷰
- 리뷰 요약과 파일 및 변경 라인별 피드백 제공
- diff를 접고 펼칠 수 있는 독립 실행형 HTML 리포트
- 구조화된 리뷰 결과를 JSON으로 내보내기
- 민감 파일과 생성 파일 자동 제외

## 요구사항

- Node.js 18 이상
- Git
- 모델 목록과 Chat Completion을 지원하는 OpenAI-compatible API

로컬 Ollama도 OpenAI-compatible 엔드포인트로 사용할 수 있습니다. 먼저 모델을 설치하세요.

```bash
ollama pull qwen3.6:35b-a3b-coding-mxfp8
```

## 설치

```bash
npm install -g codivew
codivew setup
```

`setup`에서 `ko-KR` 또는 `en`, 인증 방식(없음, API Key/Bearer, Basic Authentication), API URL, `GET /v1/models`가 반환한 모델을 선택합니다. 리뷰 요청은 `POST /v1/chat/completions`를 사용합니다. 로컬 Ollama 기본값은 인증 없는 `http://localhost:11434/v1`입니다.

엔드포인트나 인증을 변경하려면 언제든 `codivew setup`을 다시 실행하세요. 인증 정보는 터미널에 표시하지 않고 사용자만 읽을 수 있는 권한의 설정 파일에 저장하며, `config show`에서도 실제 값은 노출하지 않습니다.

setup을 다시 실행하지 않고 저장된 언어만 변경할 수도 있습니다.

```bash
codivew config set language en
codivew config set language ko-KR
```

Codivew 업데이트:

```bash
npm install -g codivew@latest
```

## 사용법

Git 저장소 안에서 Codivew를 실행하세요.

```bash
# unstaged 변경사항과 untracked 파일 리뷰
codivew
codivew working

# staged 변경사항 리뷰
codivew staged

# main과 HEAD 사이의 변경사항 리뷰
codivew branch

# 다른 기준 브랜치 사용
codivew branch --base develop
```

반복 가능한 `--context` 옵션으로 프로젝트 문맥을 추가할 수 있습니다.

```bash
codivew staged \
  --context "Node.js CLI 프로젝트" \
  --context "Node.js 18 이상을 지원해야 함"
```

이번 리뷰에만 다른 OpenAI-compatible API나 모델을 사용할 수도 있습니다. 저장된 인증 정보는 그대로 사용합니다.

```bash
codivew staged \
  --api-url https://api.example.com/v1 \
  --model qwen3.6:35b-a3b-coding-mxfp8
```

전체 명령어와 옵션 확인:

```bash
codivew --help
```

## 결과 파일

리포트는 명령을 실행한 디렉터리의 `.codivew/`에 저장됩니다. HTML 리포트는 브라우저에서 자동으로 열립니다.

```gitignore
.codivew/
```

브라우저를 열지 않으려면 `--no-open`, 저장 경로를 지정하려면 `--output`을 사용하세요.

```bash
codivew staged --no-open
codivew staged --output ./reports/review.html
codivew staged --format json
codivew staged --format both --output ./reports/review
```

`--format`은 `html`(기본값), `json`, `both`를 지원합니다. JSON만 생성할 때는 브라우저를 열지 않습니다. `both`를 사용하면 같은 기본 이름으로 `.html`과 `.json`을 생성하고 HTML 리포트만 브라우저에서 엽니다.

## 제외 파일

Codivew는 lockfile, 빌드 결과물, 생성 파일, 환경 변수 파일, 개인 키, 인증서, minified JavaScript 및 source map을 제외합니다. `.env.example`과 `.env.sample`은 리뷰 대상에 포함됩니다.
