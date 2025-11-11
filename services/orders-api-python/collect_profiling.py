#!/usr/bin/env python3
"""
Script para coletar dados de profiling detalhado
Executa requisições e coleta dados de profiling via endpoint
"""

import asyncio
import httpx
import time
import json
import statistics
from typing import Dict, List
from collections import defaultdict

async def collect_profiling_data(
    base_url: str = "http://localhost:8080",
    num_requests: int = 50,
    concurrency: int = 10
):
    """Coleta dados de profiling executando requisições"""
    print(f"\n{'='*80}")
    print(f"Coletando dados de profiling")
    print(f"Requisições: {num_requests}, Concorrência: {concurrency}")
    print(f"{'='*80}\n")
    
    order_data = {
        "customer_id": "customer-001",
        "product_id": "product-001",
        "quantity": 1,
        "total_amount": 49.99
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Verificar se profiling está habilitado
        try:
            stats_response = await client.get(f"{base_url}/profiling/stats")
            if stats_response.status_code == 200:
                stats_data = stats_response.json()
                if not stats_data.get("enabled", False):
                    print("⚠️  AVISO: Profiling não está habilitado!")
                    print("   Execute: export ENABLE_PROFILING=true")
                    print("   E reinicie a API\n")
                    return None
        except Exception as e:
            print(f"⚠️  Erro ao verificar profiling: {e}\n")
            return None
        
        # Reset profiling antes de começar
        await client.post(f"{base_url}/profiling/reset")
        
        # Warmup
        print("Warming up...")
        for _ in range(5):
            try:
                await client.post(f"{base_url}/orders/", json=order_data)
            except:
                pass
        await asyncio.sleep(1)
        
        # Reset novamente após warmup
        await client.post(f"{base_url}/profiling/reset")
        
        # Executar requisições
        print(f"Executando {num_requests} requisições...")
        start_time = time.time()
        
        semaphore = asyncio.Semaphore(concurrency)
        successes = 0
        failures = 0
        
        async def make_request():
            nonlocal successes, failures
            async with semaphore:
                try:
                    response = await client.post(f"{base_url}/orders/", json=order_data)
                    if response.status_code == 201:
                        successes += 1
                    else:
                        failures += 1
                except Exception:
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
        
        # Coletar estatísticas de profiling
        stats_response = await client.get(f"{base_url}/profiling/stats")
        if stats_response.status_code == 200:
            stats_data = stats_response.json()
            if stats_data.get("enabled", False):
                return stats_data.get("statistics", {})
        
        return None

async def main():
    """Função principal"""
    print("="*80)
    print("COLETA DE PROFILING DETALHADO - ORDERS API")
    print("="*80)
    print("\nEste script executa requisições e coleta dados de profiling")
    print("Certifique-se de que a API está rodando com ENABLE_PROFILING=true")
    print("\nPressione Enter para continuar ou Ctrl+C para cancelar...")
    
    try:
        input()
    except KeyboardInterrupt:
        print("\nCancelado pelo usuário")
        return
    
    results = {}
    
    # Teste 1: Baixa concorrência
    print("\n" + "="*80)
    print("TESTE 1: BAIXA CONCORRÊNCIA (1)")
    print("="*80)
    stats_low = await collect_profiling_data(num_requests=50, concurrency=1)
    if stats_low:
        results['low_concurrency'] = stats_low
    await asyncio.sleep(2)
    
    # Teste 2: Média concorrência
    print("\n" + "="*80)
    print("TESTE 2: MÉDIA CONCORRÊNCIA (5)")
    print("="*80)
    stats_medium = await collect_profiling_data(num_requests=50, concurrency=5)
    if stats_medium:
        results['medium_concurrency'] = stats_medium
    await asyncio.sleep(2)
    
    # Teste 3: Alta concorrência
    print("\n" + "="*80)
    print("TESTE 3: ALTA CONCORRÊNCIA (10)")
    print("="*80)
    stats_high = await collect_profiling_data(num_requests=50, concurrency=10)
    if stats_high:
        results['high_concurrency'] = stats_high
    await asyncio.sleep(2)
    
    # Teste 4: Muito alta concorrência
    print("\n" + "="*80)
    print("TESTE 4: MUITO ALTA CONCORRÊNCIA (20)")
    print("="*80)
    stats_very_high = await collect_profiling_data(num_requests=50, concurrency=20)
    if stats_very_high:
        results['very_high_concurrency'] = stats_very_high
    
    # Imprimir resultados
    if results:
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
    else:
        print("\n⚠️  Nenhum dado de profiling coletado")
        print("   Verifique se ENABLE_PROFILING=true está habilitado na API")

if __name__ == "__main__":
    asyncio.run(main())

