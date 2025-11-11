# ADR-0001: Adoção de Arquitetura Orientada a Eventos com RabbitMQ e Outbox Pattern

## Contexto

O projeto Event Stream Orders tem como objetivo validar uma arquitetura resiliente e desacoplada para um fluxo típico de e-commerce: pedido → pagamento → estoque → notificação. A comunicação entre os microsserviços precisava ser assíncrona, confiável e escalável, especialmente considerando a meta de suportar até 2.000 requisições por segundo em cenários de alta carga.

Uma das principais preocupações era garantir consistência entre a base de dados transacional (PostgreSQL) e a fila de mensagens (RabbitMQ), evitando perda ou duplicação de mensagens mesmo em falhas parciais.

## Decisão

Optamos por adotar uma **arquitetura orientada a eventos** com **RabbitMQ** como broker de mensagens assíncronas e aplicar o **Transactional Outbox Pattern** para garantir consistência eventual entre o banco de dados e o sistema de mensageria.

O Transactional Outbox Pattern foi implementado gravando eventos em uma tabela de outbox na mesma transação de negócio, e um processo assíncrono (publisher) lê essa tabela e publica os eventos no RabbitMQ.

Essa abordagem promove:
- Desacoplamento entre os microsserviços
- Resiliência em cenários de falha parcial
- Escalabilidade horizontal dos produtores e consumidores
- Confiabilidade sem necessidade de transações distribuídas (2PC)

## Consequências

**Positivas:**
- Permite um alto nível de desacoplamento entre produtores e consumidores.
- Melhora a escalabilidade e a resiliência da arquitetura.
- Garante integridade dos dados com consistência eventual, sem introduzir complexidade de transações distribuídas.

**Trade-offs e riscos:**
- A complexidade da aplicação aumenta com a introdução da tabela de outbox e o processo de publicação assíncrono.
- A latência de propagação dos eventos pode variar de acordo com o polling da outbox.
- Requer mecanismos adicionais de monitoramento e tracing para facilitar o debugging de mensagens perdidas ou duplicadas.
