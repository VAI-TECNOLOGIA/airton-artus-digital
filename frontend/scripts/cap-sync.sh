#!/usr/bin/env bash
# Wrapper de cap sync. Projeto Airton Artus Digital é Android-only, sem push/Firebase.
# Mantido como script dedicado para padronizar com os demais apps VAI (sempre usar
# `npm run cap:sync`, nunca `npx cap sync` direto).
set -euo pipefail
cd "$(dirname "$0")/.."

npx cap sync "$@"
