.PHONY: up down logs migrate revision seed seed-20 seed-all test test-e2e lint gen-api cleanup-users cleanup-expired cleanup-expired-dry-run backup-db verify-backup prod-config caddy-config

up:            ; docker compose up --build
down:          ; docker compose down
logs:          ; docker compose logs -f api web
migrate:       ; docker compose exec api alembic upgrade head
revision:      ; docker compose exec api alembic revision --autogenerate -m "$(m)"
seed:          ; docker compose exec api python -m scripts.seed
seed-20:       ; docker compose exec api python -m scripts.import_master_20_diseases
seed-all:      ; docker compose exec api python -m scripts.seed && docker compose exec api python -m scripts.import_master_20_diseases
cleanup-users: ; docker compose exec api python -m scripts.cleanup_users
cleanup-expired:         ; docker compose exec -T api python -m scripts.cleanup_expired --json
cleanup-expired-dry-run: ; docker compose exec -T api python -m scripts.cleanup_expired --dry-run --json
backup-db:     ; ./scripts/backup_postgres.sh
verify-backup: ; ./scripts/verify_backup.sh --latest
prod-config:   ; docker compose -f docker-compose.prod.yml config -q
caddy-config:  ; docker compose -f docker-compose.prod.yml -f docker-compose.caddy.yml config -q
test:          ; docker compose exec api pytest -q && cd frontend && npm run test -- --run
test-e2e:      ; ./scripts/run_e2e_isolated.sh
lint:          ; docker compose exec api ruff check . && cd frontend && npm run lint
gen-api:       ; cd frontend && npm run gen:api
