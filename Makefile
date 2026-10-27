.DEFAULT_GOAL := help

.PHONY: help setup up down build test test-python test-go test-nestjs test-frontend lint logs clean init-rabbitmq monitor

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## Copy .env.example files, install pre-commit hooks
	@echo "Setting up environment files..."
	@for f in config/*.env.example; do \
		target=$${f%.example}; \
		[ -f "$$target" ] || cp "$$f" "$$target" && echo "Created $$target"; \
	done
	@for svc in services/orders-api-python services/payment-service-nestjs services/inventory-service services/outbox-dispatcher services/notification-service; do \
		[ -f "$$svc/.env" ] || ([ -f "$$svc/env.example" ] && cp "$$svc/env.example" "$$svc/.env" && echo "Created $$svc/.env") || \
		([ -f "$$svc/.env.example" ] && cp "$$svc/.env.example" "$$svc/.env" && echo "Created $$svc/.env"); \
	done
	@command -v pre-commit >/dev/null 2>&1 && pre-commit install || echo "pre-commit not installed, skipping hooks"
	@echo "Setup complete! Run 'make up' to start services."

up: ## Start all services
	docker compose up -d

down: ## Stop all services
	docker compose down

build: ## Build all Docker images
	docker compose build

test: test-python test-go test-nestjs test-frontend ## Run all tests

test-python: ## Run Python tests
	cd services/orders-api-python && python -m pytest tests/ -v

test-go: ## Run Go tests
	cd services/inventory-service && go test ./... -v
	cd services/notification-service && go test ./... -v
	cd services/outbox-dispatcher && go test ./... -v

test-nestjs: ## Run NestJS tests
	cd services/payment-service-nestjs && npm test

test-frontend: ## Run frontend tests
	cd fe-next && npm test
	cd fe-angular && npm test -- --ci

lint: ## Run all linters
	cd services/orders-api-python && python -m ruff check app/ || true
	cd services/payment-service-nestjs && npx tsc --noEmit
	cd fe-next && npx next lint
	cd fe-angular && npx ng build

logs: ## Tail all service logs
	docker compose logs -f

clean: ## Remove containers, volumes, and build artifacts
	docker compose down -v --remove-orphans

init-rabbitmq: ## Initialize RabbitMQ queues and exchanges
	docker compose run --rm rabbitmq-init

monitor: ## Run monitoring script
	./scripts/monitor.sh
