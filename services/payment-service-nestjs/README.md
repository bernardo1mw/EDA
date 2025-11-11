# Payment Service - NestJS

Serviço de processamento de pagamentos implementado em NestJS seguindo os princípios de Clean Architecture e Clean Code.

## 🏗️ Arquitetura

### Clean Architecture Layers

```
src/
├── core/                    # Configurações e utilitários centrais
│   ├── config.ts           # Configuração da aplicação
│   ├── database.ts         # Configuração do banco de dados
│   └── logging.ts          # Logger estruturado
├── domain/                 # Regras de negócio e entidades
│   ├── models/             # Entidades e DTOs
│   └── interfaces/         # Contratos/abstrações
├── application/            # Casos de uso e serviços de aplicação
│   ├── use-cases/          # Casos de uso específicos
│   └── services/           # Serviços de aplicação
├── infrastructure/         # Implementações concretas
│   ├── database/           # Repositórios e acesso a dados
│   └── messaging/          # Publicação de eventos
└── interfaces/             # Pontos de entrada da aplicação
    ├── api/                # Controllers HTTP
    └── messaging/          # Handlers de mensagens
```

## 🚀 Funcionalidades

- **Processamento de Pagamentos**: Processa eventos `order.created` e simula autorização de pagamentos
- **Event-Driven**: Publica eventos `payment.authorized` ou `payment.declined`
- **Health Checks**: Endpoints de saúde, readiness e liveness
- **Observabilidade**: Logs estruturados e métricas
- **Resilência**: Retry automático e tratamento de erros

## 🔧 Tecnologias

- **NestJS**: Framework Node.js
- **TypeORM**: ORM para PostgreSQL
- **RabbitMQ**: Message broker
- **PostgreSQL**: Banco de dados
- **Docker**: Containerização

## 📋 Pré-requisitos

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL
- RabbitMQ

## 🚀 Execução

### Desenvolvimento

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run start:dev

# Executar testes
npm run test
```

### Produção (Docker)

```bash
# Construir e executar
docker compose up payment-service

# Apenas construir
docker compose build payment-service
```

## 🔍 Endpoints

### Health Check
- `GET /health` - Status geral do serviço
- `GET /health/ready` - Verificação de readiness
- `GET /health/live` - Verificação de liveness

## 📊 Eventos

### Consumidos
- `order.created` - Evento de pedido criado

### Publicados
- `payment.authorized` - Pagamento autorizado
- `payment.declined` - Pagamento recusado
- `payment.failed` - Falha no processamento

## 🏛️ Princípios Aplicados

### Clean Architecture
- **Independência de frameworks**: NestJS é apenas uma ferramenta
- **Testabilidade**: Fácil de testar com mocks
- **Independência de UI**: Lógica separada da interface
- **Independência de banco**: ORM abstrai o banco de dados

### Clean Code
- **Nomes expressivos**: Código auto-documentado
- **Funções pequenas**: Responsabilidade única
- **Comentários quando necessário**: Código limpo não precisa de muitos comentários
- **Tratamento de erros**: Error handling consistente

### SOLID Principles
- **S** - Single Responsibility: Cada classe tem uma responsabilidade
- **O** - Open/Closed: Aberto para extensão, fechado para modificação
- **L** - Liskov Substitution: Substituição de implementações
- **I** - Interface Segregation: Interfaces específicas
- **D** - Dependency Inversion: Dependência de abstrações

## 🔄 Fluxo de Processamento

1. **Recebe** evento `order.created` via RabbitMQ
2. **Simula** processamento de pagamento (90% sucesso)
3. **Salva** evento de pagamento no banco
4. **Publica** evento `payment.authorized/declined/failed`
5. **Registra** logs estruturados

## 📈 Monitoramento

- **Logs estruturados** em JSON
- **Health checks** para Kubernetes
- **Métricas** de processamento
- **Tracing** distribuído (preparado para OpenTelemetry)

## 🧪 Testes

```bash
# Testes unitários
npm run test

# Testes com coverage
npm run test:cov

# Testes e2e
npm run test:e2e
```

## 🔧 Configuração

Variáveis de ambiente:

```env
NODE_ENV=production
PORT=3001
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=order_process
DB_USERNAME=order_user
DB_PASSWORD=order_password
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=order_user
RABBITMQ_PASSWORD=order_password
RABBITMQ_VHOST=/
RABBITMQ_URL=amqp://order_user:order_password@rabbitmq:5672/
REDIS_HOST=redis
REDIS_PORT=6379
ELASTICSEARCH_HOST=elasticsearch
ELASTICSEARCH_PORT=9200
```

