#!/bin/bash
echo "=== URBANIX STORE Test Suite ==="

echo "1. Testing Django Backend..."
docker-compose exec -T backend pytest

echo "2. Testing Go Worker..."
(cd services/go-worker && go test ./...)

echo "3. Testing Rust Audit Tools..."
(cd services/rust-tools && cargo test)

echo "Test suite execution finished."
