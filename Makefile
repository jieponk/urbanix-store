.PHONY: dev test build clean

dev:
	docker-compose up --build

test:
	docker-compose run --rm backend pytest
	cd services/go-worker && go test ./...
	cd services/rust-tools && cargo test

migrate:
	docker-compose exec backend python manage.py migrate

superuser:
	docker-compose exec backend python manage.py createsuperuser

clean:
	docker-compose down -v
