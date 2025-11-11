# 🔧 Environment Variables Configuration

This document describes all `.env.example` files available in the project and how to configure them.

## 📋 Configuration Files

### Docker Compose Configurations

#### `config/postgres.env.example`
PostgreSQL configuration. Copy to `config/postgres.env`:
```bash
cp config/postgres.env.example config/postgres.env
```

#### `config/rabbitmq.env.example`
RabbitMQ configuration. Copy to `config/rabbitmq.env`:
```bash
cp config/rabbitmq.env.example config/rabbitmq.env
```

#### `config/elasticsearch.env.example`
Elasticsearch configuration. Copy to `config/elasticsearch.env`:
```bash
cp config/elasticsearch.env.example config/elasticsearch.env
```

#### `config/kibana.env.example`
Kibana configuration. Copy to `config/kibana.env`:
```bash
cp config/kibana.env.example config/kibana.env
```

#### `config/app.env.example`
Reference file with all environment variables. **Not used directly**, but serves as documentation.

### Services

#### `services/orders-api-python/env.example`
Main API configuration (Python + FastAPI). Copy to `services/orders-api-python/.env`:
```bash
cp services/orders-api-python/env.example services/orders-api-python/.env
```

#### `services/payment-service-nestjs/.env.example`
Payment service configuration (NestJS). Copy to `services/payment-service-nestjs/.env`:
```bash
cp services/payment-service-nestjs/.env.example services/payment-service-nestjs/.env
```

**Important:** Configure the Stripe key:
```env
STRIPE_SECRET_KEY=sk_test_your_key_here
```

#### `services/outbox-dispatcher/.env.example`
Event dispatcher configuration. Copy to `services/outbox-dispatcher/.env`:
```bash
cp services/outbox-dispatcher/.env.example services/outbox-dispatcher/.env
```

#### `services/inventory-service/.env.example`
Inventory service configuration. Copy to `services/inventory-service/.env`:
```bash
cp services/inventory-service/.env.example services/inventory-service/.env
```

#### `services/aggregator-service/.env.example`
Metrics aggregation service configuration. Copy to `services/aggregator-service/.env`:
```bash
cp services/aggregator-service/.env.example services/aggregator-service/.env
```

**Note:** This service can also use environment variables directly in `docker-compose.yml`.

### Frontend

#### `fe-next/.env.example`
Next.js frontend configuration. Copy to `fe-next/.env.local`:
```bash
cp fe-next/.env.example fe-next/.env.local
```

## 🚀 Quick Setup

To configure all files at once:

```bash
# Docker Compose configurations
cp config/postgres.env.example config/postgres.env
cp config/rabbitmq.env.example config/rabbitmq.env
cp config/elasticsearch.env.example config/elasticsearch.env
cp config/kibana.env.example config/kibana.env

# Services
cp services/orders-api-python/env.example services/orders-api-python/.env
cp services/payment-service-nestjs/.env.example services/payment-service-nestjs/.env
cp services/outbox-dispatcher/.env.example services/outbox-dispatcher/.env
cp services/inventory-service/.env.example services/inventory-service/.env
cp services/aggregator-service/.env.example services/aggregator-service/.env

# Frontend
cp fe-next/.env.example fe-next/.env.local
```

## ⚠️ Important

1. **Adjust passwords** in `.env` files to secure values for production
2. **Use Docker hostnames** (`postgres`, `rabbitmq`, etc.) when running with Docker Compose
3. **Use `localhost`** when running services locally outside Docker
