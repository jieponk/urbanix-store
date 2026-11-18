#!/bin/bash
# Jalankan SEKALI setelah deploy hari ini (dari laptop):  ./deploy/sesudah-deploy.sh urbanix@139.190.99.177
# 1) Betulkan merek salah di kalimat garansi produk (permanen)
# 2) Terjemahkan 10 deskripsi Inggris -> Indonesia (teks asli disimpan, bisa dipulihkan)
# 3) Tulis ulang artikel berita dengan gaya baru + buat artikel baru (8 berita)
set -e
SERVER="$1"
[ -n "$SERVER" ] || { echo "Cara pakai: ./deploy/sesudah-deploy.sh urbanix@IP-SERVER"; exit 1; }
ssh "$SERVER" 'bash -s' <<'REMOTE'
set -e
cd "$HOME/urbanix/app/deploy"
DC="docker compose --env-file $HOME/urbanix/.env -f docker-compose.prod.yml exec -T backend python manage.py"
echo "==> 1/3 Merek garansi produk"
$DC perbaiki_deskripsi --simpan </dev/null
echo "==> 2/3 Terjemahan deskripsi (10 produk; ulangi skrip ini besok untuk 10 berikutnya)"
$DC perbaiki_deskripsi --terjemahkan --maks 10 --simpan </dev/null || echo "(terjemahan dilewati, lanjut)"
echo "==> 3/3 Artikel berita"
$DC ringkas_berita --tulis-ulang --maks 8 </dev/null || echo "(AI berita dilewati, lanjut)"
echo "SELESAI. Kirim output di atas ke Claude kalau ada [gagal] atau ditolak."
REMOTE
