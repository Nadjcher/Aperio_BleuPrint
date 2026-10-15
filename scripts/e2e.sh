#!/usr/bin/env bash
# Orchestration E2E : base fraîche + API + front (preview) + Playwright.
# Usage : bash scripts/e2e.sh
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT_API=4100
PORT_WEB=5173
PGVER="$(ls /etc/postgresql/ 2>/dev/null | head -1)"

cleanup() {
  for p in "$PORT_API" "$PORT_WEB"; do
    pid="$(ss -ltnp 2>/dev/null | grep ":$p" | grep -oP 'pid=\K[0-9]+' | head -1 || true)"
    [ -n "${pid:-}" ] && kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT

echo "▶ Base de données fraîche…"
pg_isready >/dev/null 2>&1 || sudo -u postgres pg_ctlcluster "$PGVER" main start >/dev/null 2>&1
sudo -u postgres psql -v ON_ERROR_STOP=0 >/dev/null 2>&1 <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='projectmaster' AND pid<>pg_backend_pid();
DROP DATABASE IF EXISTS projectmaster; CREATE DATABASE projectmaster OWNER projectmaster;
SQL
sudo -u postgres psql -d projectmaster -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' >/dev/null 2>&1

echo "▶ Build…"
npm run build -w shared >/dev/null 2>&1
npm run build -w backend >/dev/null 2>&1

echo "▶ Démarrage API (port $PORT_API)…"
( cd backend && PORT=$PORT_API WORKER_ENABLED=false RATE_LIMIT_MAX=100000 AUTH_RATE_LIMIT_MAX=100000 node dist/index.js >/tmp/e2e-api.log 2>&1 & )

echo "▶ Build + preview front (port $PORT_WEB)…"
( cd frontend && VITE_API_BASE_URL=http://localhost:$PORT_API npx vite build >/dev/null 2>&1 \
  && npx vite preview --port $PORT_WEB --host >/tmp/e2e-web.log 2>&1 & )

echo "▶ Attente des serveurs…"
for i in $(seq 1 30); do
  curl -s "http://localhost:$PORT_API/health" >/dev/null 2>&1 && \
  curl -s -o /dev/null "http://localhost:$PORT_WEB/" && break
  sleep 1
done

echo "▶ Playwright…"
npx playwright test "$@"
