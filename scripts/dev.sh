#!/bin/bash
echo -e "\033[0;36m=========================================\033[0m"
echo -e "\033[0;36m  URBANIX STORE - Development Launcher  \033[0m"
echo -e "\033[0;36m=========================================\033[0m"

if ! command -v docker &> /dev/null; then
    echo -e "\033[0;31m[ERROR] Docker is not installed or not in PATH!\033[0m"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo -e "\033[0;33m[INFO] .env file not found. Copying from .env.example...\033[0m"
    cp .env.example .env
fi

echo -e "\033[0;32m[INFO] Starting Docker Containers...\033[0m"
docker-compose up --build
