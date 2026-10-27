#!/usr/bin/env python3
"""
Teste de profiling direto - simula requisições e mede tempo
Mesmo que não tenhamos acesso ao endpoint de profiling, podemos medir tempo HTTP
e usar isso para análise
"""

import asyncio
import httpx
import time
import statistics
from typing import Dict, List
import json

async def measure_request_with_breakdown(base_url: str, order_data: dict) -> Dict:
    """Mede uma requisição e tenta inferir breakdown"""
    start_total = time.perf_counter()
    
    try:
        response = await httpx.AsyncClient(timeout=30.0).post(
            f"{base_url}/orders/",
            json=order_data
        )
        elapsed_total = (time.perf_counter() - start_total) * 1000
        
        # Extrair tempo de processamento do header se disponível
        process_time = None
        if "X-Process-Time" in response.headers:
            try:
                process_time = float(response.headers["X-Process-Time"]) * 1000
            except:
                pass
        
        return {
            "success": response.status_code == 201,
            "total_ms": elapsed_total,
            "process_time_ms": process_time or elapsed_total,
            "status_code": response.status_code
        }
    except Exception as e:
        elapsed_total = (time.perf_counter() - start_total) * 1000
        return {
            "success": False,
            "total_ms": elapsed_total,
            "process_time_ms": elapsed_total,
            "error": str(e)
        }

async def run_profiling_analysis(
    base_url: str = "http://localhost:8080",
    num_requests: int = 50,
    concurrency: int = 10
):
    """Executa análise de profiling"""
    print(f"\n{'='*80}")
    print(f"Análise de Profiling - Requisições: {num_requests}, Concorrência: {concurrency}")
    print(f"{'='*80}\n")
    
    order_data = {
        "customer_id": "customer-001",
        "product_id": "product-001",
        "quantity": 1,
        "total_amount": 49.99
    }
    
    # Warmup
    print("Warming up...")
    async with httpx.AsyncClient(timeout=30.0) as client:
        for _ in range(5):
            try:
                await client.post(f"{base_url}/orders/", json=order_data)
            except:
                pass
    await asyncio.sleep(1)
    
    # Executar requisições
    print(f"Executando {num_requests} requisições...")
    start_time = time.time()
    
    results: List[Dict] = []
    semaphore = asyncio.Semaphore(concurrency)
    
    async def make_request():
        async with semaphore:
            result = await measure_request_with_breakdown(base_url, order_data)
            results.append(result)
    
    tasks = [make_request() for _ in range(num_requests)]
    await asyncio.gather(*tasks)
    
    elapsed_time = time.time() - start_time
    
    # Análise
    successes = sum(1 for r in results if r["success"])
    failures = len(results) - successes
    
    total_times = [r["total_ms"] for r in results]
    process_times = [r.get("process_time_ms", r["total_ms"]) for r in results]
    
    def calc_stats(values: List[float]) -> Dict:
        if not values:
            return {}
        sorted_vals = sorted(values)
        n = len(values)
        return {
            "count": n,
            "avg": statistics.mean(values),
            "min": min(values),
            "max": max(values),
            "p50": sorted_vals[int(n * 0.50)],
            "p95": sorted_vals[int(n * 0.95)],
            "p99": sorted_vals[int(n * 0.99)] if n > 1 else sorted_vals[0],
        }
    
    total_stats = calc_stats(total_times)
    process_stats = calc_stats(process_times)
    
    print(f"\n✓ Resultados:")
    print(f"  Total de requisições: {num_requests}")
    print(f"  Sucesso: {successes}")
    print(f"  Falhas: {failures}")
    print(f"  Taxa de sucesso: {(successes/num_requests)*100:.1f}%")
    print(f"  Tempo total: {elapsed_time:.2f}s")
    print(f"  Throughput: {num_requests/elapsed_time:.2f} req/s")
    
    print(f"\n{'='*80}")
    print("ESTATÍSTICAS DE LATÊNCIA")
    print(f"{'='*80}\n")
    
    print(f"{'Métrica':<30} {'Count':<8} {'Avg(ms)':<12} {'Min(ms)':<12} {'Max(ms)':<12} {'P50(ms)':<12} {'P95(ms)':<12} {'P99(ms)':<12}")
    print("-" * 110)
    
    if total_stats:
        print(
            f"{'Total (HTTP Request)':<30} "
            f"{total_stats['count']:<8} "
            f"{total_stats['avg']:>11.2f} "
            f"{total_stats['min']:>11.2f} "
            f"{total_stats['max']:>11.2f} "
            f"{total_stats['p50']:>11.2f} "
            f"{total_stats['p95']:>11.2f} "
            f"{total_stats['p99']:>11.2f}"
        )
    
    if process_stats:
        print(
            f"{'Process Time (Server)':<30} "
            f"{process_stats['count']:<8} "
            f"{process_stats['avg']:>11.2f} "
            f"{process_stats['min']:>11.2f} "
            f"{process_stats['max']:>11.2f} "
            f"{process_stats['p50']:>11.2f} "
            f"{process_stats['p95']:>11.2f} "
            f"{process_stats['p99']:>11.2f}"
        )
    
    # Calcular overhead de rede (diferença entre total e process)
    if total_stats and process_stats:
        network_overhead = {
            "avg": total_stats['avg'] - process_stats['avg'],
            "p95": total_stats['p95'] - process_stats['p95'],
            "p99": total_stats['p99'] - process_stats['p99'],
        }
        print(
            f"{'Network Overhead (est)':<30} "
            f"{'':<8} "
            f"{network_overhead['avg']:>11.2f} "
            f"{'':<12} "
            f"{'':<12} "
            f"{'':<12} "
            f"{network_overhead['p95']:>11.2f} "
            f"{network_overhead['p99']:>11.2f}"
        )
    
    return {
        "concurrency": concurrency,
        "num_requests": num_requests,
        "successes": successes,
        "failures": failures,
        "throughput": num_requests / elapsed_time,
        "total_stats": total_stats,
        "process_stats": process_stats
    }

async def main():
    """Função principal"""
    print("="*80)
    print("ANÁLISE DE PROFILING - ORDERS API")
    print("="*80)
    print("\nEste script mede latência de requisições HTTP")
    print("Certifique-se de que a API está rodando em http://localhost:8080")
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
    results['low_concurrency'] = await run_profiling_analysis(num_requests=50, concurrency=1)
    await asyncio.sleep(2)
    
    # Teste 2: Média concorrência
    print("\n" + "="*80)
    print("TESTE 2: MÉDIA CONCORRÊNCIA (5)")
    print("="*80)
    results['medium_concurrency'] = await run_profiling_analysis(num_requests=50, concurrency=5)
    await asyncio.sleep(2)
    
    # Teste 3: Alta concorrência
    print("\n" + "="*80)
    print("TESTE 3: ALTA CONCORRÊNCIA (10)")
    print("="*80)
    results['high_concurrency'] = await run_profiling_analysis(num_requests=50, concurrency=10)
    await asyncio.sleep(2)
    
    # Teste 4: Muito alta concorrência
    print("\n" + "="*80)
    print("TESTE 4: MUITO ALTA CONCORRÊNCIA (20)")
    print("="*80)
    results['very_high_concurrency'] = await run_profiling_analysis(num_requests=50, concurrency=20)
    
    # Análise comparativa
    print(f"\n{'='*80}")
    print("ANÁLISE COMPARATIVA")
    print(f"{'='*80}\n")
    
    print(f"{'Concorrência':<15} {'Throughput':<15} {'Avg(ms)':<15} {'P95(ms)':<15} {'P99(ms)':<15}")
    print("-" * 75)
    
    for test_name, data in results.items():
        conc = data['concurrency']
        throughput = data['throughput']
        avg = data['total_stats']['avg']
        p95 = data['total_stats']['p95']
        p99 = data['total_stats']['p99']
        print(f"{conc:<15} {throughput:>14.2f} {avg:>14.2f} {p95:>14.2f} {p99:>14.2f}")
    
    # Salvar resultados
    output_file = "profiling_analysis_results.json"
    with open(output_file, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n✓ Resultados salvos em: {output_file}")

if __name__ == "__main__":
    asyncio.run(main())

