#!/usr/bin/env bash
# Sekali saja, di VPS baru (Ubuntu 24.04), sebagai user urbanix:
#   bash server-setup.sh
# Memasang Docker, firewall, swap, zona waktu, dan update keamanan otomatis.
set -euo pipefail

echo "==> Update sistem & pasang Docker"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io docker-compose-v2 ufw unattended-upgrades openssl
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"

echo "==> Zona waktu Asia/Jakarta"
sudo timedatectl set-timezone Asia/Jakarta

echo "==> Firewall: hanya SSH, HTTP, HTTPS"
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw --force enable

echo "==> Swap 2 GB (cadangan RAM saat build)"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "==> Update keamanan otomatis"
sudo dpkg-reconfigure -f noninteractive unattended-upgrades

mkdir -p ~/urbanix/backups
echo
echo "SELESAI. Keluar dulu (ketik: exit) lalu login lagi supaya izin Docker aktif."
