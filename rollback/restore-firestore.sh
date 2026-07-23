#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cp "$ROOT/rollback/firestore/db-index.ts" "$ROOT/db/index.ts"
cp "$ROOT/rollback/firestore/package.json" "$ROOT/package.json"
cp "$ROOT/rollback/firestore/package-lock.json" "$ROOT/package-lock.json"
cd "$ROOT"
npm install
rm -rf .next
echo "Firestore data layer restored. Restore Firestore env variables, then run npm run dev."
