# Event Stream Orders

Event-driven microservices system to demonstrate resilient, observable, and high-performance architecture.

## 🏗️ Architecture

- **Microservices**: Orders API (Python/FastAPI), Payment Service (NestJS), Inventory Service, Outbox Dispatcher, Aggregator Service
- **Frontends**: Next.js (fe-next), Angular (fe-angular)
- **Message Broker**: RabbitMQ with Dead Letter Queues and automatic retry
- **Storage**: PostgreSQL with Transactional Outbox Pattern
- **Cache**: Redis for idempotency control
- **Observability**: Elastic Stack (ELK) + Filebeat + Metricbeat
- **Testing**: k6 for load testing

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for frontend and NestJS services)
- Python 3.11+ (for Orders API)
- Go 1.21+ (for Go services)

### Running the System

1. **Clone and configure the environment:**
```bash
# Quick setup: copy .env.example files from config/ and services/ directories
```

2. **Start the infrastructure:**
```bash
docker-compose up -d
```

3. **Verify the services:**
```bash
# PostgreSQL
docker-compose exec postgres psql -U order_user -d order_process -c "SELECT version();"

# RabbitMQ Management
open http://localhost:15672 (user: order_user, pass: order_password)

# Kibana
open http://localhost:5601

# Elasticsearch
curl http://localhost:9200/_cluster/health

# Orders API
curl http://localhost:8080/health/

# Payment Service
curl http://localhost:3001/health

# Aggregator Service (Metrics)
curl http://localhost:8081/health
```

## 📊 Performance Metrics

- **Throughput**: ≥ 2000 req/s
- **P99 Latency**: ≤ 200ms
- **Error Rate**: ≤ 0.1%
- **DLQ**: ≤ 0.1%
- **End-to-end Time**: ≤ 2s

## 🔍 Observability

### Kibana Dashboards
- Performance (latency, throughput)
- RabbitMQ Queues (messages, acks, DLQ)
- Distributed traces
- Business metrics

### Structured Logs
- JSON format with trace_id
- Service correlation
- Business metrics

## 🧪 Testing

### Load Testing
```bash
# Run k6 tests
cd tests/k6
k6 run load-test.js
```

### Resilience Testing
```bash
# Simulate service failure
docker-compose stop payment-service
# Verify automatic recovery
```

## 📁 Project Structure

```
order_process/
├── docs/                    # Documentation (PRD, ADRs)
├── services/               # Microservices
│   ├── orders-api-python/  # Orders API (Python/FastAPI)
│   ├── payment-service-nestjs/ # Payment Service (NestJS)
│   ├── inventory-service/  # Inventory Service (Go)
│   ├── outbox-dispatcher/  # Event Dispatcher (Go)
│   └── aggregator-service/ # Aggregator Service (Go)
├── fe-next/               # Frontend (Next.js/React)
├── fe-angular/            # Frontend (Angular)
├── tests/                  # Tests
│   └── k6/                # Load tests
├── config/                 # Configuration
│   ├── logstash/          # Log pipeline
│   ├── filebeat/          # Log collection
│   ├── metricbeat/        # System metrics
│   └── kibana/            # Dashboards
├── scripts/               # Initialization scripts
├── docker-compose.yml     # Service orchestration
└── README.md              # This file
```

## 🔧 Development

### Frontend Development

#### Next.js Frontend (fe-next)
```bash
cd fe-next
npm install
npm run dev
# Access at http://localhost:3000
```

#### Angular Frontend (fe-angular)
```bash
cd fe-angular
npm install
ng serve
# Access at http://localhost:4200
```

### Adding a New Service
1. Create the directory in `services/`
2. Implement following the established pattern
3. Add configuration to `docker-compose.yml`
4. Configure observability (logs, metrics, traces)

### Code Standards
- Clean Architecture
- Structured JSON logs
- OpenTelemetry instrumentation
- Unit and integration tests
- API documentation

## 📈 Monitoring

### Important Metrics
- **API**: latency, throughput, error rate
- **Queues**: ready messages, acks, DLQ
- **Database**: connections, slow queries
- **System**: CPU, memory, disk

### Alerts
- P99 Latency > 200ms
- Error rate > 0.1%
- DLQ > 0.1%
- Service failure

## 🚨 Troubleshooting

### Common Issues
1. **Service won't start**: Check logs with `docker-compose logs <service>`
2. **Low performance**: Check metrics in Kibana
3. **Messages in DLQ**: Analyze error logs
4. **Incomplete traces**: Verify OpenTelemetry configuration

### Useful Commands
```bash
# Logs from all services
docker-compose logs -f

# Logs from specific service
docker-compose logs -f orders-api
docker-compose logs -f payment-service
docker-compose logs -f aggregator-service

# Service status
docker-compose ps

# Restart service
docker-compose restart <service>

# Clean volumes
docker-compose down -v
```

## 📚 Documentation

### Architecture & Design
- [PRD](docs/PRD.md) - Product Requirements Document
- [ADR-01](docs/ADR-01.md) - Event-Driven Architecture
- [ADR-02](docs/ADR-02.md) - Idempotency and DLQ
- [ADR-03](docs/ADR-03.md) - Observability
- [ADR-04](docs/ADR-04.md) - Load Testing
- [Kibana Filters](docs/KIBANA_FILTERS.md) - Kibana dashboard filters

### Setup & Configuration
- [Environment Setup](ENV_SETUP.md) - Complete guide for environment variables

### Service-Specific
- [Orders API](services/orders-api-python/README.md) - Python/FastAPI service documentation
- [Payment Service](services/payment-service-nestjs/README.md) - NestJS service documentation

## 🤝 Contributing

1. Fork the project
2. Create a branch for your feature
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

