# Event Stream Orders

Sistema de microsserviços orientado a eventos para demonstrar arquitetura resiliente e observável com alta performance.

## 🏗️ Arquitetura

- **Microsserviços**: Orders API, Payment Service, Inventory Service, Notification Service, Aggregator Service
- **Mensageria**: RabbitMQ com Dead Letter Queues e retry automático
- **Storage**: PostgreSQL com Transactional Outbox Pattern
- **Cache**: Redis para controle de idempotência
- **Observabilidade**: Elastic Stack (ELK) + OpenTelemetry
- **Testes**: k6 para testes de carga

## 🚀 Início Rápido

### Pré-requisitos
- Docker e Docker Compose
- Node.js 18+ (para desenvolvimento)
- Go 1.21+ (para serviços)

### Executando o Sistema

1. **Clone e configure o ambiente:**
```bash
git clone <repository>
cd order_process
cp .env.example .env
```

2. **Inicie a infraestrutura:**
```bash
docker-compose up -d
```

3. **Verifique os serviços:**
```bash
# PostgreSQL
docker-compose exec postgres psql -U order_user -d order_process -c "SELECT version();"

# RabbitMQ Management
open http://localhost:15672 (user: order_user, pass: order_password)

# Kibana
open http://localhost:5601

# Elasticsearch
curl http://localhost:9200/_cluster/health
```

## 📊 Métricas de Performance

- **Throughput**: ≥ 2000 req/s
- **Latência P99**: ≤ 200ms
- **Taxa de erro**: ≤ 0,1%
- **DLQ**: ≤ 0,1%
- **Tempo ponta-a-ponta**: ≤ 2s

## 🔍 Observabilidade

### Dashboards Kibana
- Performance (latência, throughput)
- Filas RabbitMQ (mensagens, acks, DLQ)
- Traces distribuídos
- Métricas de negócio

### Logs Estruturados
- JSON format com trace_id
- Correlação entre serviços
- Métricas de negócio

## 🧪 Testes

### Testes de Carga
```bash
# Executar testes k6
cd tests/k6
k6 run load-test.js
```

### Testes de Resiliência
```bash
# Simular falha de serviço
docker-compose stop payment-service
# Verificar recuperação automática
```

## 📁 Estrutura do Projeto

```
order_process/
├── docs/                    # Documentação (PRD, ADRs)
├── services/               # Microsserviços
│   ├── orders-api/         # API de pedidos
│   ├── outbox-dispatcher/  # Dispatcher de eventos
│   ├── payment-service/    # Serviço de pagamento
│   ├── inventory-service/  # Serviço de estoque
│   ├── notification-service/ # Serviço de notificação
│   └── aggregator-service/ # Serviço de agregação
├── tests/                  # Testes
│   └── k6/                # Testes de carga
├── config/                 # Configurações
│   ├── logstash/          # Pipeline de logs
│   ├── metricbeat/        # Métricas do sistema
│   └── kibana/            # Dashboards
├── scripts/               # Scripts de inicialização
├── docker-compose.yml     # Orquestração de serviços
└── README.md              # Este arquivo
```

## 🔧 Desenvolvimento

### Adicionando Novo Serviço
1. Crie o diretório em `services/`
2. Implemente seguindo o padrão estabelecido
3. Adicione configuração no `docker-compose.yml`
4. Configure observabilidade (logs, métricas, traces)

### Padrões de Código
- Clean Architecture
- Logs estruturados em JSON
- Instrumentação OpenTelemetry
- Testes unitários e de integração
- Documentação de API

## 📈 Monitoramento

### Métricas Importantes
- **API**: latência, throughput, taxa de erro
- **Filas**: mensagens prontas, acks, DLQ
- **Database**: conexões, queries lentas
- **Sistema**: CPU, memória, disco

### Alertas
- Latência P99 > 200ms
- Taxa de erro > 0,1%
- DLQ > 0,1%
- Falha de serviço

## 🚨 Troubleshooting

### Problemas Comuns
1. **Serviço não inicia**: Verificar logs com `docker-compose logs <service>`
2. **Performance baixa**: Verificar métricas no Kibana
3. **Mensagens na DLQ**: Analisar logs de erro
4. **Traces incompletos**: Verificar configuração OpenTelemetry

### Comandos Úteis
```bash
# Logs de todos os serviços
docker-compose logs -f

# Logs de serviço específico
docker-compose logs -f orders-api

# Status dos serviços
docker-compose ps

# Reiniciar serviço
docker-compose restart <service>

# Limpar volumes
docker-compose down -v
```

## 📚 Documentação

- [PRD](docs/PRD.md) - Product Requirements Document
- [ADR-01](docs/ADR-01.md) - Arquitetura Orientada a Eventos
- [ADR-02](docs/ADR-02.md) - Idempotência e DLQ
- [ADR-03](docs/ADR-03.md) - Observabilidade
- [ADR-04](docs/ADR-04.md) - Testes de Carga

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto é licenciado sob a MIT License.

