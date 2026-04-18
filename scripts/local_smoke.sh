#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8000}"
WEB_BASE="${WEB_BASE:-http://localhost:5173}"
CHECK_FRONTEND="${CHECK_FRONTEND:-1}"
DEMO_URL="${DEMO_URL:-https://www.tiktok.com/@calingeorgescu_official/video/7438219348761239045}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

pass() {
  printf 'PASS %s\n' "$1"
}

fail() {
  printf 'FAIL %s\n' "$1" >&2
  if [[ -f "$TMP_DIR/body" ]]; then
    printf 'Response body:\n' >&2
    sed -n '1,120p' "$TMP_DIR/body" >&2
  fi
  exit 1
}

request() {
  local name="$1"
  local method="$2"
  local path="$3"
  local expected="$4"
  local body="${5:-}"

  local args=(-sS -o "$TMP_DIR/body" -w '%{http_code}' -X "$method")
  if [[ -n "$body" ]]; then
    args+=(-H 'Content-Type: application/json' -H 'X-Actor: local-smoke' -H 'X-Role: aide' -d "$body")
  fi

  local status
  if ! status="$(curl "${args[@]}" "$API_BASE$path")"; then
    fail "$name could not reach $API_BASE$path"
  fi

  if [[ "$status" != "$expected" ]]; then
    fail "$name expected HTTP $expected, got $status"
  fi

  pass "$name"
}

request_with_header() {
  local name="$1"
  local method="$2"
  local path="$3"
  local expected="$4"
  local header="$5"

  local status
  if ! status="$(curl -sS -o "$TMP_DIR/body" -w '%{http_code}' -X "$method" -H "$header" "$API_BASE$path")"; then
    fail "$name could not reach $API_BASE$path"
  fi

  if [[ "$status" != "$expected" ]]; then
    fail "$name expected HTTP $expected, got $status"
  fi

  pass "$name"
}

printf 'Local smoke against API=%s WEB=%s\n' "$API_BASE" "$WEB_BASE"

request "health" GET "/health" 200
request "demo videos" GET "/demo-videos" 200
request "clear storage" DELETE "/storage" 200
request "ingest demo" POST "/ingest" 200 "{\"url\":\"$DEMO_URL\",\"constituency\":\"RO\"}"
request "list videos" GET "/videos" 200
request "dashboard" GET "/dashboard" 200
request "briefing" POST "/briefing" 200 '{"video_ids":[],"constituency":"RO","requester_name":"Local Smoke"}'
request "audit rejects non-DPO" GET "/audit" 403
request_with_header "audit accepts DPO" GET "/audit" 200 "X-Role: dpo"
request "missing video returns 404" GET "/videos/not-a-real-video-id" 404

if [[ "$CHECK_FRONTEND" == "1" ]]; then
  status="$(curl -sS -o "$TMP_DIR/body" -w '%{http_code}' "$WEB_BASE" || true)"
  if [[ ! "$status" =~ ^(2|3)[0-9][0-9]$ ]]; then
    fail "frontend expected HTTP 2xx/3xx, got ${status:-000}"
  fi
  pass "frontend root"
else
  printf 'SKIP frontend root\n'
fi

printf 'Local smoke passed.\n'
