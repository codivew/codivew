#!/bin/sh

set -eu

usage() {
  cat <<'EOF'
Usage: ./review.sh [staged|working|branch] [--open]

Optional environment variables:
  REVIEW_API_TOKEN   Review server Bearer token (default: dev-token)
  REVIEW_API_URL     Review endpoint
  BASE_BRANCH        Base branch for branch mode (default: main)
EOF
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1" >&2
    exit 1
  fi
}

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  color_blue="$(printf '\033[34m')"
  color_green="$(printf '\033[32m')"
  color_red="$(printf '\033[31m')"
  color_yellow="$(printf '\033[33m')"
  color_bold="$(printf '\033[1m')"
  color_reset="$(printf '\033[0m')"
else
  color_blue=""
  color_green=""
  color_red=""
  color_yellow=""
  color_bold=""
  color_reset=""
fi

print_info() {
  printf '  %s%-14s%s %s\n' "$color_blue" "$1" "$color_reset" "$2"
}

show_spinner() {
  spinner_pid="$1"
  spinner_step=0
  while kill -0 "$spinner_pid" 2>/dev/null; do
    case "$spinner_step" in
      0) spinner_frame='|' ;;
      1) spinner_frame='/' ;;
      2) spinner_frame='-' ;;
      *) spinner_frame='\' ;;
    esac
    spinner_elapsed="$(( $(date +%s) - request_started_at ))"
    printf '\r\033[2K  %s%s%s AI 리뷰 생성 중... %ss' \
      "$color_yellow" "$spinner_frame" "$color_reset" "$spinner_elapsed"
    spinner_step="$(( (spinner_step + 1) % 4 ))"
    sleep 1
  done
  printf '\r\033[2K'
}

cleanup() {
  if [ -n "${curl_pid:-}" ] && kill -0 "$curl_pid" 2>/dev/null; then
    kill "$curl_pid" 2>/dev/null || true
  fi
  rm -f \
    "${diff_file:-}" \
    "${request_file:-}" \
    "${response_file:-}" \
    "${metadata_file:-}" \
    "${curl_error_file:-}" \
    "${git_error_file:-}"
}

mode="${1:-staged}"
open_result="false"

if [ "${1:-}" = "--open" ]; then
  mode="staged"
  open_result="true"
elif [ "${2:-}" = "--open" ]; then
  open_result="true"
elif [ "$#" -gt 1 ]; then
  usage >&2
  exit 1
fi

case "$mode" in
  staged | working | branch) ;;
  -h | --help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac

require_command git
require_command jq
require_command curl

repository_root="$(git rev-parse --show-toplevel)"
repository="$(basename "$repository_root")"
commit_sha="$(git -C "$repository_root" rev-parse HEAD)"
base_branch="${BASE_BRANCH:-main}"
review_api_url="${REVIEW_API_URL:-http://localhost:3000}/api/reviews"
review_api_token="${REVIEW_API_TOKEN:-dev-token}"

diff_file="$(mktemp "${TMPDIR:-/tmp}/code-review-diff.XXXXXX")"
request_file="$(mktemp "${TMPDIR:-/tmp}/code-review-request.XXXXXX")"
response_file="$(mktemp "${TMPDIR:-/tmp}/code-review-response.XXXXXX")"
metadata_file="$(mktemp "${TMPDIR:-/tmp}/code-review-metadata.XXXXXX")"
curl_error_file="$(mktemp "${TMPDIR:-/tmp}/code-review-curl-error.XXXXXX")"
git_error_file="$(mktemp "${TMPDIR:-/tmp}/code-review-git-error.XXXXXX")"
curl_pid=""
trap cleanup EXIT
trap 'exit 130' HUP INT TERM

case "$mode" in
  staged)
    git -C "$repository_root" diff --cached --unified=5 --diff-filter=ACMRT \
      >"$diff_file" 2>"$git_error_file" || git_failed="true"
    ;;
  working)
    git -C "$repository_root" diff --unified=5 --diff-filter=ACMRT \
      >"$diff_file" 2>"$git_error_file" || git_failed="true"
    ;;
  branch)
    git -C "$repository_root" diff "$base_branch...HEAD" --unified=5 --diff-filter=ACMRT \
      >"$diff_file" 2>"$git_error_file" || git_failed="true"
    ;;
esac

if [ "${git_failed:-false}" = "true" ]; then
  printf '%s✗%s Git diff 생성에 실패했습니다.\n' "$color_red" "$color_reset" >&2
  sed 's/^/  /' "$git_error_file" >&2
  exit 1
fi

if [ ! -s "$diff_file" ]; then
  printf '%s✗%s 리뷰할 변경사항이 없습니다. (mode: %s)\n' \
    "$color_red" "$color_reset" "$mode" >&2
  exit 1
fi

changed_files="$(awk '/^diff --git / { count++ } END { print count + 0 }' "$diff_file")"
diff_bytes="$(wc -c <"$diff_file" | tr -d ' ')"
short_commit_sha="$(git -C "$repository_root" rev-parse --short HEAD)"

printf '\n%s%sAI Code Review%s\n' "$color_bold" "$color_blue" "$color_reset"
printf '%s\n' '────────────────────────────────────────'
print_info 'Repository' "$repository"
print_info 'Mode' "$mode"
print_info 'Base branch' "$base_branch"
print_info 'Commit' "$short_commit_sha"
print_info 'Changed files' "$changed_files"
print_info 'Diff size' "${diff_bytes} bytes"
print_info 'Endpoint' "$review_api_url"
printf '%s\n\n' '────────────────────────────────────────'

jq -n \
  --arg repository "$repository" \
  --arg baseBranch "$base_branch" \
  --arg mode "$mode" \
  --arg commitSha "$commit_sha" \
  --rawfile diff "$diff_file" \
  '{
    repository: $repository,
    baseBranch: $baseBranch,
    mode: $mode,
    commitSha: $commitSha,
    diff: $diff
  }' >"$request_file"

request_started_at="$(date +%s)"
curl \
  --silent \
  --show-error \
  --location \
  --max-redirs 5 \
  --proto-redir '=http,https' \
  --output "$response_file" \
  --write-out '%{http_code}\n%{url_effective}' \
  --request POST \
  "$review_api_url" \
  --header "Authorization: Bearer $review_api_token" \
  --header 'Content-Type: application/json' \
  --header 'Accept: text/plain' \
  --data-binary "@$request_file" \
  >"$metadata_file" 2>"$curl_error_file" &
curl_pid="$!"

if [ -t 1 ]; then
  show_spinner "$curl_pid"
else
  printf 'AI 리뷰 생성 중...\n'
fi

if wait "$curl_pid"; then
  curl_exit=0
else
  curl_exit="$?"
fi
curl_pid=""
elapsed_seconds="$(( $(date +%s) - request_started_at ))"

if [ "$curl_exit" -ne 0 ]; then
  printf '%s✗%s 리뷰 서버 연결 실패 (%ss)\n' \
    "$color_red" "$color_reset" "$elapsed_seconds" >&2
  if [ -s "$curl_error_file" ]; then
    sed 's/^/  /' "$curl_error_file" >&2
  fi
  exit 1
fi

curl_metadata="$(cat "$metadata_file")"
http_status="$(printf '%s\n' "$curl_metadata" | sed -n '1p')"
effective_url="$(printf '%s\n' "$curl_metadata" | sed -n '2p')"

if [ "$http_status" != "201" ]; then
  printf '%s✗%s 리뷰 생성 실패 · HTTP %s · %ss\n' \
    "$color_red" "$color_reset" "$http_status" "$elapsed_seconds" >&2
  printf '  Endpoint: %s\n' "$effective_url" >&2
  if jq -e . "$response_file" >/dev/null 2>&1; then
    jq . "$response_file" >&2
  else
    sed 's/^/  /' "$response_file" >&2
  fi
  exit 1
fi

review_url="$(tr -d '\r\n' <"$response_file")"
case "$review_url" in
  http://* | https://*) ;;
  *)
    printf '%s✗%s 서버가 올바르지 않은 URL을 반환했습니다: %s\n' \
      "$color_red" "$color_reset" "$review_url" >&2
    exit 1
    ;;
esac

review_id="$(basename "$review_url" .html)"
printf '%s✓ 리뷰 생성 완료%s\n' "$color_green" "$color_reset"
print_info 'Review ID' "$review_id"
print_info 'Elapsed' "${elapsed_seconds}s"
print_info 'Result URL' "$review_url"

if [ "$open_result" = "true" ]; then
  if command -v open >/dev/null 2>&1; then
    open "$review_url"
    printf '\n%s✓%s 브라우저에서 결과를 열었습니다.\n' "$color_green" "$color_reset"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$review_url"
    printf '\n%s✓%s 브라우저에서 결과를 열었습니다.\n' "$color_green" "$color_reset"
  else
    printf '\n%s!%s 브라우저 실행 명령을 찾지 못했습니다. URL을 직접 여세요.\n' \
      "$color_yellow" "$color_reset" >&2
  fi
fi
