#!/usr/bin/env bash
set -euo pipefail

echo "▶ [1/3] Removing node_modules..."
rm -rf node_modules

echo "▶ [2/3] Installing from frozen lockfile..."
bun install --frozen-lockfile

echo "▶ [3/3] Type-checking with tsc --noEmit..."
npx tsc --noEmit -p tsconfig.app.json

echo "✅ CI check passed: clean install + type-check green."
