#!/usr/bin/env python3
"""
Script para executar profiling detalhado
Habilita profiling na API e executa requisições para coletar dados
"""

import asyncio
import httpx
import time
import os
import json
import statistics
from typing import Dict, List
from collections import defaultdict

# Habilitar profiling
os.environ["ENABLE_PROFILING"] = "true"

async def run_profiling_test(
    base_url: str = "http://localhost:8080",
    num_requests: int = 50,
    concurrency: int = 10
):
    """Executa teste de profiling"""
    print(f"\n{'='*80}")
    print(f"PROFILING DETALHADO")
    print(f"Requisições: {num_requests}, Concorrência: {concurrency}")
    print(f"{'='*80}\n")
    
    order_data = {
        "customer_id": "customer-001",
        "product_id": "product-001",
        "quantity": 1,
        "total_amount": 49.99
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Warmup
        print("Warming up...")
        for _ in range(5):
            try:
                await client.post(f"{base_url}/orders/", json=order_data)
            except:
                pass
        await asyncio.sleep(1)
        
        # Executar requisições
        print(f"Executando {num_requests} requisições...")
        start_time = time.time()
        
        semaphore = asyncio.Semaphore(concurrency)
        successes = 0
        failures = 0
        
        async def make_request():
            async with semaphore:
                try:
                    response = await client.post(f"{base_url}/orders/", json=order_data)
                    if response.status_code == 201:
                        nonlocal successes
                        successes += 1
                    else:
                        nonlocal failures
                        failures += 1
                except Exception:
                    nonlocal failures
                    failures += 1
        
        tasks = [make_request() for _ in range(num_requests)]
        await asyncio.gather(*tasks)
        
        elapsed_time = time.time() - start_time
        
        print(f"\n✓ Requisições completadas")
        print(f"  Sucesso: {successes}")
        print(f"  Falhas: {failures}")
        print(f"  Tempo total: {elapsed_time:.2f}s")
        print(f"  Throughput: {num_requests/elapsed_time:.2f} req/s")
        
        # Aguardar um pouco para garantir que profiling foi coletado
        await asyncio.sleep(1)
        
        # Importar profiler após as requisições
        from app.core.profiling import profiler
        
        # Obter estatísticas
        stats = profiler.get_statistics()
        
        return stats

async def main():
    """Função principal"""
    print("="*80)
    print("PROFILING DETALHADO - ORDERS API")
    print("="*80)
    print("\nEste script habilita profiling na API e mede cada etapa")
    print("Certifique-se de que a API está rodando em http://localhost:8080")
    print("\n⚠️  IMPORTANTE: Reinicie a API com ENABLE_PROFILING=true antes de executar")
    print("\nPressione Enter para continuar ou Ctrl+C para cancelar...")
    
    try:
        input()
    except KeyboardInterrupt:
        print("\nCancelado pelo usuário")
        return
    
    # Verificar se profiling está habilitado
    if os.getenv("ENABLE_PROFILING", "false").lower() != "true":
        print("\n⚠️  AVISO: ENABLE_PROFILING não está habilitado")
        print("   Execute: export ENABLE_PROFILING=true")
        print("   E reinicie a API\n")
    
    results = {}
    
    # Teste 1: Baixa concorrência
    print("\n" + "="*80)
    print("TESTE 1: BAIXA CONCORRÊNCIA (1)")
    print("="*80)
    stats_low = await run_profiling_test(num_requests=50, concurrency=1)
    results['low_concurrency'] = stats_low
    await asyncio.sleep(2)
    
    # Reset profiler
    from app.core.profiling import profiler
    profiler.reset()
    
    # Teste 2: Média concorrência
    print("\n" + "="*80)
    print("TESTE 2: MÉDIA CONCORRÊNCIA (5)")
    print("="*80)
    stats_medium = await run_profiling_test(num_requests=50, concurrency=5)
    results['medium_concurrency'] = stats_medium
    await asyncio.sleep(2)
    
    profiler.reset()
    
    # Teste 3: Alta concorrência
    print("\n" + "="*80)
    print("TESTE 3: ALTA CONCORRÊNCIA (10)")
    print("="*80)
    stats_high = await run_profiling_test(num_requests=50, concurrency=10)
    results['high_concurrency'] = stats_high
    await asyncio.sleep(2)
    
    profiler.reset()
    
    # Teste 4: Muito alta concorrência
    print("\n" + "="*80)
    print("TESTE 4: MUITO ALTA CONCORRÊNCIA (20)")
    print("="*80)
    stats_very_high = await run_profiling_test(num_requests=50, concurrency=20)
    results['very_high_concurrency'] = stats_very_high
    
    # Imprimir resultados
    print(f"\n{'='*80}")
    print("RESULTADOS DO PROFILING")
    print(f"{'='*80}\n")
    
    for test_name, stats in results.items():
        print(f"\n{test_name.upper().replace('_', ' ')}:")
        print(f"{'Operação':<30} {'Count':<8} {'Avg(ms)':<12} {'Min(ms)':<12} {'Max(ms)':<12} {'P50(ms)':<12} {'P95(ms)':<12} {'P99(ms)':<12}")
        print("-" * 110)
        
        for operation, data in sorted(stats.items()):
            print(
                f"{operation:<30} "
                f"{int(data['count']):<8} "
                f"{data['avg']:>11.2f} "
                f"{data['min']:>11.2f} "
                f"{data['max']:>11.2f} "
                f"{data['p50']:>11.2f} "
                f"{data['p95']:>11.2f} "
                f"{data['p99']:>11.2f}"
            )
    
    # Salvar resultados
    output_file = "detailed_profiling_results.json"
    with open(output_file, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n✓ Resultados salvos em: {output_file}")

if __name__ == "__main__":
    asyncio.run(main())

