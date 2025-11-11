# ADR-0004: Estratégia de Testes de Carga e Métricas de Desempenho com k6 e Kibana

## Contexto

Para validar a capacidade da arquitetura Event Stream Orders de operar sob alta carga (meta de 2.000 requisições por segundo), era necessário estabelecer uma estratégia eficaz de **testes de carga**, além de mecanismos para visualizar e interpretar os resultados em tempo real.

Os testes deveriam abranger não apenas as APIs HTTP, mas também o comportamento assíncrono dos eventos entre serviços, verificando a resiliência e performance de ponta a ponta.

## Decisão

Adotamos a ferramenta **k6** para realização dos testes de carga, por sua facilidade de scripting, integração com CI/CD e suporte a cenários complexos. Para análise dos resultados:

- Os testes de carga emitem métricas customizadas que são exportadas para o Elasticsearch.
- Criamos **dashboards específicos no Kibana** para visualizar throughput, latência, taxa de erro e tempo de fila por serviço.
- Os testes foram planejados para simular cenários com bursts de tráfego e falhas controladas (como queda temporária de um consumidor), a fim de validar a resiliência do sistema.

## Consequências

**Positivas:**
- Permite validação realista e contínua da performance do sistema sob carga.
- Facilita identificação de gargalos e impactos em tempo de fila ou consumo de mensagens.
- Os dashboards no Kibana permitem acompanhamento visual e histórico da evolução da performance.

**Trade-offs e riscos:**
- A criação dos scripts de testes requer conhecimento detalhado do fluxo de negócio e suas dependências.
- Necessário gerenciar corretamente os dados de carga para evitar falsos positivos (como limites de hardware local).
- A integração com observabilidade precisa estar bem configurada para garantir métricas precisas e acionáveis.
