# Guia de Profiling Detalhado

Este guia explica como usar o sistema de profiling para medir o tempo de cada etapa da requisição.

## 📋 Pré-requisitos

1. API rodando em `http://localhost:8080`
2. Profiling habilitado via variável de ambiente

## 🚀 Como Usar

### Passo 1: Habilitar Profiling

**Opção 1: Variável de ambiente**
```bash
export ENABLE_PROFILING=true
# Reiniciar a API
```

**Opção 2: Docker Compose**
```yaml
# Adicionar ao docker-compose.yml
environment:
  - ENABLE_PROFILING=true
```

**Opção 3: Diretamente no código**
```python
# Em app/core/profiling.py
ENABLE_PROFILING = True  # Mudar de False para True
```

### Passo 2: Executar Teste de Profiling

```bash
cd services/orders-api-python
python3 run_profiling.py
```

### Passo 3: Verificar Resultados

O script irá:
1. Executar requisições com diferentes níveis de concorrência
2. Coletar dados de profiling de cada etapa
3. Exibir estatísticas detalhadas
4. Salvar resultados em `detailed_profiling_results.json`

## 📊 Métricas Coletadas

O sistema de profiling mede:

### 1. **validation** - Validação de dados
- Tempo gasto validando os dados da requisição
- Esperado: < 1ms

### 2. **domain_creation** - Criação do modelo de domínio
- Tempo para criar o objeto `Order`
- Esperado: < 1ms

### 3. **outbox_creation** - Criação do evento Outbox
- Tempo para criar o objeto `OutboxEvent`
- Esperado: < 1ms

### 4. **json_serialization** - Serialização JSON
- Tempo para serializar o evento para JSON
- Esperado: < 2ms (com orjson)

### 5. **db_connection** - Aquisição de conexão
- Tempo para adquirir conexão do pool
- Esperado: < 5ms (pode aumentar sob carga)

### 6. **db_transaction** - Tempo total da transação
- Tempo total da transação (inclui INSERTs e commit)
- Esperado: < 50ms (pode aumentar sob carga)

### 7. **db_insert_order** - INSERT na tabela orders
- Tempo para inserir o pedido
- Esperado: < 20ms

### 8. **db_insert_outbox** - INSERT na tabela outbox_events
- Tempo para inserir o evento
- Esperado: < 20ms

### 9. **db_row_conversion** - Conversão de row para objeto
- Tempo para converter resultado do banco para objeto
- Esperado: < 1ms

### 10. **response_creation** - Criação da resposta
- Tempo para criar o objeto `OrderResponse`
- Esperado: < 1ms

## 🔍 Interpretando Resultados

### Exemplo de Saída:

```
Operação                        Count    Avg(ms)      Min(ms)      Max(ms)      P50(ms)      P95(ms)      P99(ms)
------------------------------------------------------------------------------------------------------------------
db_transaction                  50      45.23        12.45        156.78       42.30        89.45        123.45
db_insert_order                 50      18.23        8.45         45.67        17.30        32.45        42.30
db_insert_outbox                50      15.45        6.23         38.90        14.30        28.90        35.67
db_connection                   50      8.23         2.45         25.67        7.30        18.45        22.30
json_serialization              50      0.45         0.12         1.23         0.42         0.89         1.12
validation                      50      0.12         0.05         0.45         0.10         0.23         0.35
```

### Análise:

1. **Se `db_transaction` é o maior gargalo:**
   - Problema está na transação do banco
   - Verificar locks e contenção
   - Considerar otimizações de índices

2. **Se `db_connection` é alto:**
   - Pool de conexões pode estar esgotado
   - Aumentar `max_connections` ou ajustar pool

3. **Se `db_insert_order` ou `db_insert_outbox` são altos:**
   - Pode ser problema de índices
   - Verificar locks nessas tabelas

4. **Se outros componentes são altos:**
   - Revisar implementação desses componentes
   - Considerar otimizações específicas

## 📈 Comparação com Baseline

Execute o profiling em diferentes níveis de concorrência para identificar onde ocorre degradação:

```bash
# Baixa concorrência (baseline)
python3 run_profiling.py  # Concorrência 1

# Alta concorrência
python3 run_profiling.py  # Concorrência 20

# Comparar resultados
```

## 🔧 Endpoints de Profiling

### GET `/profiling/stats`
Retorna estatísticas de profiling em tempo real:

```bash
curl http://localhost:8080/profiling/stats
```

### POST `/profiling/reset`
Reseta os dados de profiling:

```bash
curl -X POST http://localhost:8080/profiling/reset
```

## ⚠️ Notas Importantes

1. **Overhead de Profiling:**
   - Profiling adiciona overhead mínimo (~0.1ms por operação)
   - Use apenas para diagnóstico, não em produção

2. **Habilitar apenas quando necessário:**
   - Desabilite profiling após coletar dados
   - Não deixe habilitado em produção

3. **Interpretação:**
   - Valores podem variar entre execuções
   - Execute múltiplas vezes para obter dados confiáveis

## 📝 Exemplo de Análise

```json
{
  "db_transaction": {
    "avg": 45.23,
    "p95": 89.45,
    "p99": 123.45
  },
  "db_insert_order": {
    "avg": 18.23,
    "p95": 32.45,
    "p99": 42.30
  }
}
```

**Análise:**
- `db_transaction` P99 = 123.45ms
- `db_insert_order` P99 = 42.30ms
- Diferença: ~81ms (pode ser tempo de commit ou locks)

**Conclusão:**
- O tempo de commit ou locks está adicionando ~81ms
- Investigar configurações do PostgreSQL (synchronous_commit, etc.)

