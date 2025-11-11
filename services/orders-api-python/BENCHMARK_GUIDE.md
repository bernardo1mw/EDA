# Guia de Benchmark e Teste de Otimizações

Este guia explica como usar os scripts de benchmark para testar o impacto de otimizações isoladamente.

## 📋 Pré-requisitos

1. API rodando em `http://localhost:8080`
2. Dependências instaladas: `pip install -r requirements.txt`
3. Banco de dados PostgreSQL acessível

## 🚀 Scripts Disponíveis

### 1. `benchmark_performance.py`
Script completo de benchmark que testa diferentes níveis de concorrência.

**Uso:**
```bash
cd services/orders-api-python
python benchmark_performance.py
```

**O que faz:**
- Testa baseline (estado atual)
- Testa com baixa, média e alta concorrência
- Compara resultados
- Gera relatório em `benchmark_results.json`

### 2. `test_optimizations.py`
Script focado em testar diferentes níveis de concorrência para identificar gargalos.

**Uso:**
```bash
cd services/orders-api-python
python test_optimizations.py
```

**O que faz:**
- Testa com concorrências diferentes (1, 5, 10, 20)
- Identifica se o problema é de contenção
- Gera relatório em `optimization_test_results.json`

## 🔍 Como Testar Otimizações Individuais

Para testar o impacto isolado de cada otimização, você precisa:

### Passo 1: Criar uma Baseline
Primeiro, teste o estado atual:
```bash
python benchmark_performance.py
```
Anote os resultados, especialmente:
- Latência média
- Latência P95 e P99
- Throughput (RPS)

### Passo 2: Testar Cada Otimização

#### Otimização 1: Remover Logging do Hot Path

**Antes (com logging):**
```python
# Em app/application/use_cases/order_use_cases.py, linha 52-63
self.log_info(
    "Order created successfully with outbox event",
    order_id=str(saved_order.id),
    # ... resto dos campos
)
```

**Depois (sem logging):**
```python
# Remover ou comentar o log_info
# OPTIMIZATION: Removed logging from hot path
```

**Teste:**
1. Reverter a mudança (adicionar logging de volta)
2. Executar: `python benchmark_performance.py`
3. Aplicar a mudança (remover logging)
4. Executar novamente: `python benchmark_performance.py`
5. Comparar resultados

#### Otimização 2: OrderResponse Direto vs from_orm

**Antes (com from_orm):**
```python
# Em app/application/use_cases/order_use_cases.py, linha 68
return OrderResponse.from_orm(saved_order)
```

**Depois (instanciação direta):**
```python
return OrderResponse(
    id=saved_order.id,
    customer_id=saved_order.customer_id,
    # ... resto dos campos
)
```

**Teste:** Seguir mesmo processo acima.

#### Otimização 3: JSON Serialization Fora da Transação

**Antes (dentro da transação):**
```python
# Em app/infrastructure/database/repositories.py
async with conn.transaction():
    # ... insert order
    event_data_json = json.dumps(outbox_event.event_data)  # DENTRO
    await conn.execute(outbox_insert_query, ...)
```

**Depois (fora da transação):**
```python
# FORA da transação
event_data_json = orjson.dumps(outbox_event.event_data).decode('utf-8')
async with conn.transaction():
    # ... insert order
    await conn.execute(outbox_insert_query, ...)
```

**Teste:** Seguir mesmo processo acima.

#### Otimização 4: Usar orjson vs json padrão

**Antes (json):**
```python
import json
event_data_json = json.dumps(outbox_event.event_data)
```

**Depois (orjson):**
```python
import orjson
event_data_json = orjson.dumps(outbox_event.event_data).decode('utf-8')
```

**Teste:** Seguir mesmo processo acima.

## 📊 Interpretando Resultados

### Métricas Importantes

1. **Throughput (RPS)**: Requisições por segundo
   - Maior = melhor
   - Indica capacidade de processamento

2. **Latência Média**: Tempo médio de resposta
   - Menor = melhor
   - Indica performance geral

3. **Latência P95/P99**: Percentis de latência
   - Menor = melhor
   - Indica performance sob carga

4. **Taxa de Erro**: Porcentagem de falhas
   - Menor = melhor
   - Deve ser próximo de 0%

### Análise de Resultados

**Comparação de Otimização:**
```
Baseline:  P99 = 7102ms
Otimizado: P99 = 6500ms
Melhoria:  ~8.5% (602ms mais rápido)
```

**Se a melhoria for < 5%:**
- Otimização pode não ser significativa
- Considerar outros gargalos

**Se a melhoria for > 10%:**
- Otimização é efetiva
- Manter a mudança

## 🔧 Teste Manual Rápido

Para um teste rápido sem scripts:

```bash
# Teste 1: Requisição única
time curl -X POST http://localhost:8080/orders/ \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "customer-001",
    "product_id": "product-001",
    "quantity": 1,
    "total_amount": 49.99
  }'

# Teste 2: Múltiplas requisições (10x)
for i in {1..10}; do
  time curl -X POST http://localhost:8080/orders/ \
    -H "Content-Type: application/json" \
    -d '{
      "customer_id": "customer-001",
      "product_id": "product-001",
      "quantity": 1,
      "total_amount": 49.99
    }'
done
```

## 📝 Exemplo de Resultado Esperado

```
================================================================================
RESULTADOS DO BENCHMARK
================================================================================

Nome                          RPS      Avg      P50      P95      P99      Erros
--------------------------------------------------------------------------------
Baseline (Estado Atual)       45.2     105.3    98.5     245.6    699.2    0.00%
Baixa Concorrência (1)        38.5     26.0     25.1     28.3     32.1     0.00%
Média Concorrência (5)        42.8     116.7    108.2    268.4    752.1    0.00%
Alta Concorrência (20)        48.3     414.2    285.6    1245.8   3856.4   0.00%
```

## 🎯 Próximos Passos

1. **Identificar Gargalos:**
   - Se P99 aumenta muito com concorrência → problema de contenção
   - Se P99 alto mesmo com baixa concorrência → problema de query/transação

2. **Aplicar Otimizações:**
   - Testar cada otimização isoladamente
   - Medir impacto
   - Manter apenas as que melhoram significativamente

3. **Otimizações de Banco:**
   - Se problema persistir, verificar:
     - Índices nas tabelas
     - Locks e contenção
     - Configurações do PostgreSQL

## ⚠️ Notas Importantes

- Sempre teste em ambiente isolado
- Execute múltiplas iterações para resultados confiáveis
- Compare sempre com baseline
- Considere variação natural (teste várias vezes)
- Se melhorias são < 5%, podem não valer a complexidade adicional

