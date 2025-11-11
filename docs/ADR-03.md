# ADR-0003: Adoção de Elastic Stack e OpenTelemetry para Observabilidade Unificada

## Contexto

Com a arquitetura baseada em microsserviços assíncronos, tornou-se essencial adotar uma solução de **observabilidade unificada** para diagnóstico de falhas, análise de performance e rastreamento distribuído de eventos.

Dada a alta carga esperada (2.000 req/s) e o uso de filas e processamentos assíncronos, o simples uso de logs locais ou métricas básicas não seria suficiente para monitorar o comportamento do sistema e garantir a confiabilidade necessária.

## Decisão

Optamos por adotar a combinação do **Elastic Stack (ELK: Elasticsearch, Logstash, Kibana)** para logs estruturados e métricas, e **OpenTelemetry** para geração e coleta de spans de tracing distribuído.

A arquitetura de observabilidade foi definida da seguinte forma:

- Todos os serviços enviam logs estruturados em JSON para o Logstash.
- As métricas e logs são armazenados no Elasticsearch.
- Os traços distribuídos (spans) são exportados via OpenTelemetry para o Elasticsearch ou outro back-end compatível.
- Visualizações e dashboards são centralizados no Kibana.

## Consequências

**Positivas:**
- Visibilidade completa do comportamento dos serviços, inclusive com rastreamento de eventos entre múltiplos microsserviços.
- Facilidade na identificação de gargalos e erros, inclusive em cenários assíncronos.
- Estrutura escalável e flexível, com suporte amplo da comunidade.

**Trade-offs e riscos:**
- O Elastic Stack exige configuração e ajuste fino para lidar com alta carga de ingestão de logs e métricas.
- Pode haver custos operacionais elevados, especialmente com volumes altos de dados e retenção longa.
- A adoção de OpenTelemetry requer padronização da instrumentação de código em todos os serviços.
