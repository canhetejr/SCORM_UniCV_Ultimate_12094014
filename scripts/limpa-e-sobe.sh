#!/bin/bash
# UniCV Studio — limpa e sobe de novo (Docker)
# Rodar na raiz: bash scripts/limpa-e-sobe.sh

set -e
cd "$(dirname "$0")/.."

echo "==> Parando containers..."
docker compose -f docker-compose.studio.yml down --remove-orphans 2>/dev/null || true

echo "==> Limpando cache de build Docker..."
docker builder prune -f 2>/dev/null || true

echo "==> Build e subindo..."
docker compose -f docker-compose.studio.yml build --no-cache
docker compose -f docker-compose.studio.yml up -d

echo ""
echo "Pronto! Studio em:"
echo "  - Web:  http://localhost:3000"
echo "  - API:  http://localhost:3001"
