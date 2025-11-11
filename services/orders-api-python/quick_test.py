#!/usr/bin/env python3
"""
Teste rápido do estado atual do sistema
Executa poucas requisições para validar funcionamento básico
"""

import asyncio
import time
import httpx
import statistics
from typing import List

async def quick_test():
    """Executa teste rápido"""
    print("="*70)
    print("TESTE RÁPIDO - ORDERS API")
    print("="*70)
    print("\nTestando estado atual do sistema...")
    
    base_url = "http://localhost:8080"
    order_data = {
        "customer_id": "customer-001",
        "product_id": "product-001",
        "quantity": 1,
        "total_amount": 49.99
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Teste de conectividade
        print("\n1. Testando conectividade...")
        try:
            health = await client.get(f"{base_url}/health/")
            if health.status_code == 200:
                print("   ✓ API está respondendo")
            else:
                print(f"   ✗ API retornou status {health.status_code}")
                return
        except Exception as e:
            print(f"   ✗ Erro ao conectar: {e}")
            return
        
        # Teste de criação de ordem
        print("\n2. Testando criação de ordem...")
        latencies: List[float] = []
        successes = 0
        failures = 0
        
        num_requests = 20
        concurrency = 5
        
        print(f"   Executando {num_requests} requisições com concorrência {concurrency}...")
        
        semaphore = asyncio.Semaphore(concurrency)
        
        async def make_request():
            async with semaphore:
                start = time.perf_counter()
                try:
                    response = await client.post(
                        f"{base_url}/orders/",
                        json=order_data
                    )
                    elapsed = (time.perf_counter() - start) * 1000
                    latencies.append(elapsed)
                    
                    if response.status_code == 201:
                        nonlocal successes
                        successes += 1
                    else:
                        nonlocal failures
                        failures += 1
                        print(f"   ⚠ Requisição falhou com status {response.status_code}")
                except Exception as e:
                    elapsed = (time.perf_counter() - start) * 1000
                    latencies.append(elapsed)
                    failures += 1
                    print(f"   ✗ Erro: {e}")
        
        start_time = time.time()
        tasks = [make_request() for _ in range(num_requests)]
        await asyncio.gather(*tasks)
        elapsed_time = time.time() - start_time
        
        # Resultados
        if latencies:
            latencies.sort()
            n = len(latencies)
            
            print(f"\n3. Resultados:")
            print(f"   Total de requisições: {num_requests}")
            print(f"   Sucesso: {successes}")
            print(f"   Falhas: {failures}")
            print(f"   Taxa de sucesso: {(successes/num_requests)*100:.1f}%")
            print(f"   Tempo total: {elapsed_time:.2f}s")
            print(f"   Throughput: {num_requests/elapsed_time:.2f} req/s")
            print(f"\n   Latência:")
            print(f"   - Média: {statistics.mean(latencies):.2f}ms")
            print(f"   - Mínima: {min(latencies):.2f}ms")
            print(f"   - Máxima: {max(latencies):.2f}ms")
            print(f"   - P50: {latencies[int(n*0.50)]:.2f}ms")
            print(f"   - P95: {latencies[int(n*0.95)]:.2f}ms")
            if n > 1:
                print(f"   - P99: {latencies[int(n*0.99)]:.2f}ms")
            
            # Diagnóstico
            print(f"\n4. Diagnóstico:")
            avg_latency = statistics.mean(latencies)
            p95_latency = latencies[int(n*0.95)]
            
            if avg_latency < 100:
                print("   ✓ Latência média está boa (<100ms)")
            elif avg_latency < 500:
                print("   ⚠ Latência média está moderada (100-500ms)")
            else:
                print("   ✗ Latência média está alta (>500ms)")
            
            if p95_latency < 500:
                print("   ✓ P95 está bom (<500ms)")
            elif p95_latency < 2000:
                print("   ⚠ P95 está moderado (500-2000ms)")
            else:
                print("   ✗ P95 está alto (>2000ms)")
            
            if failures > 0:
                print(f"   ⚠ Há {failures} falhas - investigar")
            else:
                print("   ✓ Sem falhas")
        else:
            print("   ✗ Nenhuma requisição foi completada com sucesso")

if __name__ == "__main__":
    asyncio.run(quick_test())

