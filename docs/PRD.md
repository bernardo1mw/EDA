# Product Requirements Document (PRD)

## 1. Visão Geral

O projeto **Event Stream Orders** tem como objetivo demonstrar uma arquitetura moderna e resiliente baseada em **microsserviços orientados a eventos**, com foco em **observabilidade, tolerância a falhas e alto throughput**.

O sistema simula o fluxo de um e-commerce simplificado — **criação de pedidos, pagamento, reserva de estoque e notificação ao cliente** — implementado de forma desacoplada, assíncrona e rastreável ponta a ponta.

---

## 2. Objetivos do Produto

* Demonstrar uma **arquitetura event-driven** robusta com garantias de *at-least-once delivery*.
* Garantir **consistência eventual** entre serviços independentes.
* Implementar **observabilidade completa**: logs estruturados, métricas e traces distribuídos.
* Comprovar **resiliência e estabilidade sob alta carga** (>2000 req/s).
* Servir como **prova de conceito** para práticas modernas de engenharia de software (Clean Architecture, idempotência, retry, DLQ, etc.).

---

## 3. Escopo

### Incluído

* **Microsserviços:**

  * **Orders API:** Criação de pedidos e persistência com *Transactional Outbox*.
  * **Outbox Dispatcher:** Publicação confiável de eventos no RabbitMQ.
  * **Payment Service:** Simulação de autorização de pagamento.
  * **Inventory Service:** Reserva e liberação de estoque.
  * **Notification Service:** Simulação de envio de e-mails.
  * **Aggregator Service:** Geração de relatórios e KPIs.
* **Mensageria:** RabbitMQ com exchanges, DLQs e retries automáticos.
* **Storage:** PostgreSQL (transacional e materialized views), Redis (dedup/idempotência).
* **Observabilidade:** Elastic Stack (ELK) + OpenTelemetry (métricas, logs, traces).
* **Testes de Carga:** k6 com thresholds de latência, erro e throughput.

### Excluído

* Autenticação e autorização reais.
* Frontend UI (apenas API).
* Integrações externas reais (pagamento, e-mail, etc.).

---

## 4. Requisitos Funcionais

| ID   | Requisito                        | Descrição                                                                                                            |
| ---- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| RF01 | Criar pedido                     | O cliente envia um pedido via API (`POST /orders`).                                                                  |
| RF02 | Publicar evento de pedido criado | O serviço Orders publica `order.created` via Outbox.                                                                 |
| RF03 | Processar pagamento              | O serviço Payment consome `order.created` e publica `payment.authorized` ou `payment.declined`.                      |
| RF04 | Reservar estoque                 | O serviço Inventory consome `payment.authorized` e publica `inventory.reserved` (ou `inventory.rejected` se falhar). |
| RF05 | Enviar notificação               | O serviço Notification consome `inventory.reserved` e registra o envio do e-mail.                                    |
| RF06 | Agregar métricas                 | O serviço Aggregator mantém visões e estatísticas de throughput e tempo médio de processamento.                      |

---

## 5. Requisitos Não Funcionais

| Categoria           | Requisito                                    | Meta                                           |
| ------------------- | -------------------------------------------- | ---------------------------------------------- |
| **Performance**     | Throughput mínimo sustentado                 | ≥ 2000 requisições/s (`POST /orders`)          |
| **Latência**        | P99 de requisição API                        | ≤ 200ms                                        |
| **Disponibilidade** | Resiliência a falhas de serviço              | Nenhuma perda de mensagem sob reinício isolado |
| **Escalabilidade**  | Suporte a múltiplos consumidores por serviço | Escalável horizontalmente                      |
| **Confiabilidade**  | Entrega de eventos                           | *At-least-once* com idempotência               |
| **Observabilidade** | Logs e métricas centralizados                | 100% dos serviços rastreáveis via trace_id     |
| **Testabilidade**   | Testes automatizados e de carga              | CI + k6 stress test                            |
| **Mantenabilidade** | Código modular e instrumentado               | Arquitetura limpa e desacoplada                |

---

## 6. Fluxo de Alto Nível

```
Cliente → Orders API → (TX: Order + Outbox)
             ↓
     Outbox Dispatcher → publish "order.created"
             ↓
          Payment Service → publish "payment.authorized"/"payment.declined"
             ↓
          Inventory Service → publish "inventory.reserved"/"inventory.rejected"
             ↓
          Notification Service → log envio e métricas
             ↓
          Aggregator → atualiza KPIs
```

---

## 7. Observabilidade e Monitoramento

* **Elastic Stack (ELK):** logs estruturados centralizados.
* **OpenTelemetry → Elastic APM:** traces HTTP e AMQP correlacionados.
* **Metricbeat:** métricas de RabbitMQ, PostgreSQL e containers.
* **Dashboards Kibana:**

  * Latência API (P50/P95/P99).
  * Throughput por serviço.
  * Fila: mensagens prontas, acks, DLQ.
  * Tempo ponta-a-ponta médio por pedido.

---

## 8. Validação de Desempenho

* **Ferramenta:** k6.
* **Cenário:** 30s rampa → 2min platô @ 2000 req/s → 30s decaimento.
* **Critérios de Sucesso:**

  * 99,9% de requisições concluídas sem erro.
  * P99 ≤ 200ms.
  * DLQ < 0,1% de mensagens.
  * Capacidade de recuperação após falha de serviço sem perda de dados.

---

## 9. Critérios de Aceite

* O fluxo completo (Order → Notification) funciona de forma assíncrona e observável.
* Todos os serviços produzem logs estruturados e rastreáveis por `trace_id`.
* O sistema mantém integridade sob falhas transitórias.
* Os testes de carga comprovam desempenho mínimo exigido.
* Dashboards e traces permitem diagnóstico completo ponta a ponta.

---

## 10. Métricas de Sucesso

| Indicador                 | Meta              |
| ------------------------- | ----------------- |
| Throughput Sustentado     | ≥ 2000 req/s      |
| Latência P99 API          | ≤ 200 ms          |
| Falhas de Processamento   | ≤ 0,1%            |
| Taxa de DLQ               | ≤ 0,1%            |
| Tempo médio ponta-a-ponta | ≤ 2s              |
| Cobertura de logs/traces  | 100% dos serviços |

---

## 11. Futuras Extensões (Opcional)

* Substituição do RabbitMQ por Kafka (comparativo de throughput).
* Autenticação JWT e multi-tenant.
* Deployment em Kubernetes (HPA com métricas de fila).
* Integração com Prometheus/Grafana.
* Interface web para monitoramento de eventos.

---