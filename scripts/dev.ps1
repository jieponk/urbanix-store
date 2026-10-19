# URBANIX STORE Development Startup Script (Windows PowerShell)
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  URBANIX STORE - Development Launcher  " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check Docker Desktop
if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Docker belum terinstall atau belum masuk PATH sistem!" -ForegroundColor Red
    Exit 1
}

if (-not (Test-Path ".env")) {
    Write-Host "[INFO] File .env tidak ditemukan. Menyalin dari .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
}

Write-Host "[INFO] Menjalankan kontainer Docker (PostgreSQL, Redis, Backend, Storefront)..." -ForegroundColor Green
docker-compose up --build
