# Guia de Filtros e Buscas de Eventos no Kibana

## Acesso ao Kibana
- URL: http://localhost:5601
- Data View: `order-process-logs` (padrão: `order-process-logs-*`)

## Filtros KQL (Kibana Query Language)

### 1. Eventos de Criação de Orders
```
service_name.keyword: orders-api AND message: "Order created"
```

### 2. Eventos de Publicação (RabbitMQ)
```
message: "published" OR message: "event published"
```

### 3. Eventos de Pagamento
```
service_name.keyword: payment-service OR message: "payment"
```

### 4. Buscar por Order ID
```
order_id: "70957cd8-b92d-490b-aa39-28c2d6f2da99"
```

### 5. Buscar por Customer ID
```
customer_id: "customer-workflow-test"
```

### 6. Buscar por Operation Type
```
operation: "create_order" OR operation: "publish_order_created"
```

### 7. Eventos de Erro
```
level: "ERROR" OR level: "error"
```

### 8. Eventos de um Serviço Específico
```
service_name.keyword: orders-api
```
ou
```
service_name.keyword: payment-service
```

### 9. Eventos nos Últimos 15 Minutos
```
@timestamp >= now-15m AND service_name.keyword: (orders-api OR payment-service)
```

### 10. Todos os Eventos de Negócio (excluindo logs técnicos)
```
message: * AND NOT message: "INFO:" AND NOT message: "Application startup"
```

### 11. Eventos de Order Completo (criação + pagamento)
```
order_id: "70957cd8-b92d-490b-aa39-28c2d6f2da99" AND (operation: "create_order" OR message: "Payment processed")
```

### 12. Eventos por Container
```
container.name.keyword: order_process_orders_api
```
ou
```
container.name.keyword: order_process_payment_service
```

## Queries Avançadas

### Buscar Fluxo Completo de uma Order
```
order_id: "ORDER_ID_AQUI" AND (message: "Order created" OR message: "Payment processed" OR message: "published")
```
Ordenar por: `@timestamp: asc`

### Eventos de Alta Frequência (últimos 5 minutos)
```
@timestamp >= now-5m AND (service_name.keyword: orders-api OR service_name.keyword: payment-service) AND level: "INFO"
```

### Correlação por Customer ID
```
customer_id: "customer-001" AND (message: "Order" OR message: "Payment")
```

## Filtros por Campos Estruturados

### Todos os Eventos com Order ID
```
exists: order_id
```

### Eventos com Operation
```
exists: operation
```

### Eventos com Trace ID (para distributed tracing)
```
exists: trace_id
```

## Salvando Filtros no Kibana

1. No **Discover**, aplique o filtro desejado
2. Clique em **Save** (salvar como Saved Search)
3. Nome: ex. "Eventos de Orders"
4. Use **Add to dashboard** para criar visualizações

## Dashboards Recomendados

### Dashboard de Eventos de Negócio
- Visualização 1: Timeline de eventos por serviço
- Visualização 2: Contador de eventos por tipo
- Visualização 3: Últimos eventos (tabela)
- Filtro padrão: `service_name.keyword: (orders-api OR payment-service)`

### Dashboard de Erros
- Filtro: `level: (ERROR OR error OR WARN OR warn)`
- Agrupar por: `service_name.keyword`

## Busca via API Elasticsearch

### Exemplo: Buscar eventos de uma order específica
```bash
curl -X POST 'http://localhost:9200/order-process-logs-*/_search' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "bool": {
        "must": [
          {"term": {"order_id": "70957cd8-b92d-490b-aa39-28c2d6f2da99"}}
        ]
      }
    },
    "sort": [{"@timestamp": "asc"}],
    "size": 100
  }'
```

### Exemplo: Buscar todos os eventos de criação de orders
```bash
curl -X POST 'http://localhost:9200/order-process-logs-*/_search' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "bool": {
        "must": [
          {"term": {"service_name.keyword": "orders-api"}},
          {"match": {"message": "Order created"}}
        ]
      }
    },
    "sort": [{"@timestamp": "desc"}],
    "size": 50
  }'
```

### Exemplo: Agregação de eventos por serviço
```bash
curl -X POST 'http://localhost:9200/order-process-logs-*/_search' \
  -H 'Content-Type: application/json' \
  -d '{
    "size": 0,
    "aggs": {
      "events_by_service": {
        "terms": {
          "field": "service_name.keyword",
          "size": 10
        },
        "aggs": {
          "by_level": {
            "terms": {
              "field": "level.keyword",
              "size": 5
            }
          }
        }
      }
    }
  }'
```

## Eventos no RabbitMQ

Para visualizar eventos diretamente no RabbitMQ:

1. Acesse: http://localhost:15672
2. Login: `order_user` / `order_password`
3. Vá em **Exchanges** → `amq.topic`
4. Verifique **Bindings**:
   - `order.created` (orders-api publica)
   - `payment.authorized` (payment-service publica)

## Campos Disponíveis nos Logs

### Campos Principais
- `@timestamp`: Data/hora do evento
- `service_name`: Nome do serviço (orders-api, payment-service)
- `message`: Mensagem do log
- `level`: Nível do log (INFO, ERROR, WARN)
- `order_id`: ID da ordem (quando aplicável)
- `customer_id`: ID do cliente (quando aplicável)
- `operation`: Operação realizada
- `container.name`: Nome do container Docker

### Campos Adicionais
- `trace_id`: ID de rastreamento distribuído
- `span_id`: ID do span
- `http_method`: Método HTTP (quando aplicável)
- `http_path`: Caminho HTTP (quando aplicável)
- `http_status`: Status HTTP (quando aplicável)

