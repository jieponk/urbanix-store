.PHONY: dev test test-services migrate superuser deploy clean

# Jalankan stack pengembangan lokal (storefront, backend, database)
dev:
	docker compose up --build

# Tes backend Django (stack harus sudah jalan: make dev)
test:
	docker compose exec -T backend python manage.py test store

# Tes layanan eksperimental (opsional, butuh Go & Rust terpasang)
test-services:
	cd services/go-worker && go test ./...
	cd services/rust-tools && cargo test

migrate:
	docker compose exec backend python manage.py migrate

superuser:
	docker compose exec backend python manage.py createsuperuser

# Deploy produksi: make deploy SERVER=urbanix@IP DOMAIN=urbanix.id
deploy:
	./deploy/deploy.sh $(SERVER) $(DOMAIN)

# Hapus kontainer + data database LOKAL (tidak menyentuh server produksi)
clean:
	docker compose down -v
