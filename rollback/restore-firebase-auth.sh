#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/rollback/firebase-auth"
cp "$SRC/login-route.ts" "$ROOT/app/api/auth/login/route.ts"
cp "$SRC/session.ts" "$ROOT/app/lib/session.ts"
cp "$SRC/firebase-auth.ts" "$ROOT/app/lib/firebase-auth.ts"
cp "$SRC/db-index.ts" "$ROOT/db/index.ts"
cp "$SRC/db-bootstrap.ts" "$ROOT/db/bootstrap.ts"
cp "$SRC/db-schema.ts" "$ROOT/db/schema.ts"
cp "$SRC/dashboard-route.ts" "$ROOT/app/api/dashboard/route.ts"
cp "$SRC/package.json" "$ROOT/package.json"
echo "Firebase Authentication code restored. Run npm install and restore Firebase environment variables."
