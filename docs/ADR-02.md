# ADR-0002: Estratégia de Idempotência, Retries e Dead Letter Queues (DLQ)

## Contexto

Na arquitetura orientada a eventos do projeto Event Stream Orders, os serviços se comunicam via RabbitMQ. Como eventos podem ser entregues mais de uma vez (at-least-once delivery), era necessário garantir que os consumidores fossem **idempotentes** para evitar efeitos colaterais indesejados, como duplicação de pedidos ou notificações.

Além disso, em situações de falha temporária ou erro de processamento, era importante definir estratégias de **reentrega (retry)** e tratamento de mensagens problemáticas por meio de **Dead Letter Queues (DLQs)**.

## Decisão

Adotamos a seguinte estratégia:

- **Idempotência com Redis:** Utilizamos Redis para armazenar a chave de idempotência de cada mensagem processada com TTL, garantindo que o processamento de mensagens duplicadas seja descartado.
- **Retries automáticos no consumidor:** Cada consumidor possui uma política de reentrega com backoff exponencial, limitado a 3 tentativas.
- **Dead Letter Queues (DLQ):** Após o número máximo de tentativas, mensagens com erro são enviadas para uma fila DLQ específica, para análise e correção manual posterior.

## Consequências

**Positivas:**
- Garante consistência no processamento mesmo em casos de reentrega de eventos.
- Reduz o impacto de falhas temporárias com tentativas automáticas de reprocessamento.
- As DLQs permitem visibilidade e tratamento controlado de mensagens com erro persistente.

**Trade-offs e riscos:**
- A introdução de Redis para controle de idempotência adiciona uma dependência externa e custo operacional.
- A lógica de reentrega e DLQ aumenta a complexidade do consumidor e precisa ser bem monitorada para não gerar filas não processadas.
- Exige políticas operacionais claras para lidar com DLQs e garantir que mensagens problemáticas sejam analisadas a tempo.
