# Jalankan stack pengembangan lokal (Windows PowerShell). Konfigurasi default ada di docker-compose.yml.
Set-Location (Join-Path $PSScriptRoot "..")
if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Docker belum terpasang atau belum masuk PATH." -ForegroundColor Red
    Exit 1
}
Write-Host "[INFO] Storefront: http://localhost:3000   API: http://localhost:8000/api/v1/" -ForegroundColor Green
docker compose up --build
