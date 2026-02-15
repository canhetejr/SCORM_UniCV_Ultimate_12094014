#!/usr/bin/env bash
# Roda o UniCV Studio no WSL: sobe o banco, aplica migrações e inicia API + Web.
# Uso: dentro do WSL, na raiz do projeto: bash scripts/run-studio-wsl.sh

set -e
cd "$(dirname "$0")/.."

echo "==> Subindo Postgres (docker compose)..."
docker compose -f docker-compose.studio.yml up -d db

echo "==> Aguardando Postgres ficar pronto..."
for i in {1..30}; do
  if docker compose -f docker-compose.studio.yml exec -T db pg_isready -U postgres -d unicv 2>/dev/null; then
    echo "Postgres pronto."
    break
  fi
  if [[ $i -eq 30 ]]; then
    echo "Timeout aguardando Postgres."
    exit 1
  fi
  sleep 2
done

echo "==> Prisma generate e migrate..."
cd studio/api && npx prisma generate && npx prisma migrate deploy && cd ../..

echo "==> Iniciando API (porta 3001) e Web (porta 3000)..."
echo "    API: http://localhost:3001"
echo "    Web: http://localhost:3000"
echo "    Ctrl+C para parar."
npm run studio:dev &
API_PID=$!
npm run studio:web:dev &
WEB_PID=$!
trap "kill $API_PID $WEB_PID 2>/dev/null; exit" INT TERM
wait
