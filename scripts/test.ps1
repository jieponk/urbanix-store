# Tes backend Django (Windows PowerShell). Stack harus sudah jalan (scripts/dev.ps1).
Set-Location (Join-Path $PSScriptRoot "..")
$fail = $false

Write-Host "== 1. Backend Django ==" -ForegroundColor Yellow
docker compose exec -T backend python manage.py test store
if ($LASTEXITCODE -ne 0) { $fail = $true }

if (Get-Command "go" -ErrorAction SilentlyContinue) {
    Write-Host "== 2. Go worker (eksperimental) ==" -ForegroundColor Yellow
    Push-Location services/go-worker; go test ./...; if ($LASTEXITCODE -ne 0) { $fail = $true }; Pop-Location
} else { Write-Host "== 2. Go worker: dilewati (Go tidak terpasang) ==" }

if (Get-Command "cargo" -ErrorAction SilentlyContinue) {
    Write-Host "== 3. Rust tools (eksperimental) ==" -ForegroundColor Yellow
    Push-Location services/rust-tools; cargo test; if ($LASTEXITCODE -ne 0) { $fail = $true }; Pop-Location
} else { Write-Host "== 3. Rust tools: dilewati (Rust tidak terpasang) ==" }

if ($fail) { Write-Host "ADA TES YANG GAGAL" -ForegroundColor Red; Exit 1 } else { Write-Host "SEMUA TES LULUS" -ForegroundColor Green }
