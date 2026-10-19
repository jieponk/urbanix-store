# URBANIX STORE Test Suite Executable Script (Windows PowerShell)
Write-Host "=========================================" -ForegroundColor Magenta
Write-Host "   URBANIX STORE - Automated Test Suite  " -ForegroundColor Magenta
Write-Host "=========================================" -ForegroundColor Magenta

Write-Host "`n[1/3] Testing Python Django Backend (pytest)..." -ForegroundColor Yellow
docker-compose exec -T backend pytest
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Backend tests failed!" -ForegroundColor Red
} else {
    Write-Host "[PASS] Backend tests succeeded!" -ForegroundColor Green
}

Write-Host "`n[2/3] Testing Go Catalog Import Worker..." -ForegroundColor Yellow
Set-Location services/go-worker
go test ./...
Set-Location ../..

Write-Host "`n[3/3] Testing Rust Audit Security Tools..." -ForegroundColor Yellow
Set-Location services/rust-tools
cargo test
Set-Location ../..

Write-Host "`n[COMPLETED] Pengujian selesai!" -ForegroundColor Cyan
