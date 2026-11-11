#!/bin/bash
# Tes backend Django. Stack harus sudah jalan (scripts/dev.sh atau make dev).
cd "$(dirname "$0")/.."
FAIL=0

echo "== 1. Backend Django =="
docker compose exec -T backend python manage.py test store || FAIL=1

# Layanan eksperimental: hanya dites bila Go / Rust terpasang.
if command -v go &> /dev/null; then
  echo "== 2. Go worker (eksperimental) =="
  (cd services/go-worker && go test ./...) || FAIL=1
else
  echo "== 2. Go worker: dilewati (Go tidak terpasang) =="
fi
if command -v cargo &> /dev/null; then
  echo "== 3. Rust tools (eksperimental) =="
  (cd services/rust-tools && cargo test) || FAIL=1
else
  echo "== 3. Rust tools: dilewati (Rust tidak terpasang) =="
fi

[ $FAIL -eq 0 ] && echo "SEMUA TES LULUS" || echo "ADA TES YANG GAGAL"
exit $FAIL
