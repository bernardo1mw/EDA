#!/usr/bin/env python3
"""
Script para testar otimizações individuais
Mede o impacto de cada otimização isoladamente
"""

import asyncio
import time
import statistics
import httpx
import json
from typing import List, Dict, Tuple
from dataclasses import dataclass, asdict

@dataclass
class LatencyStats:
    """Estatísticas de latência"""
    total: float
    validation: float = 0.0
    domain_creation: float = 0.0
    database: float = 0.0
    serialization: float = 0.0
    response: float = 0.0

@dataclass
class TestResult:
    """Resultado de um teste"""
    test_name: str
    iterations: int
    avg_total_ms: float
    p50_ms: float
    p95_ms: float
    p99_ms: float
    min_ms: float
    max_ms: float
    success_rate: float
    throughput_rps: float

class OptimizationTester:
    """Classe para testar otimizações"""
    
    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    async def test_endpoint(
        self,
        test_name: str,
        num_iterations: int = 50,
        concurrency: int = 5
    ) -> TestResult:
        """Testa o endpoint de criação de ordem"""
        print(f"\n{'='*70}")
        print(f"Teste: {test_name}")
        print(f"Iterações: {num_iterations}, Concorrência: {concurrency}")
        print(f"{'='*70}")
        
        order_data = {
            "customer_id": "customer-001",
            "product_id": "product-001",
            "quantity": 1,
            "total_amount": 49.99
        }
        
        latencies: List[float] = []
        successes = 0
        failures = 0
        
        # Warmup
        print("Warming up...")
        for _ in range(5):
            try:
                await self.client.post(f"{self.base_url}/orders/", json=order_data)
            except:
                pass
        await asyncio.sleep(1)
        
        # Teste real
        print(f"Executando {num_iterations} requisições...")
        start_time = time.time()
        
        semaphore = asyncio.Semaphore(concurrency)
        
        async def make_request():
            async with semaphore:
                req_start = time.perf_counter()
                try:
                    response = await self.client.post(
                        f"{self.base_url}/orders/",
                        json=order_data
                    )
                    elapsed = (time.perf_counter() - req_start) * 1000
                    latencies.append(elapsed)
                    
                    if response.status_code == 201:
                        nonlocal successes
                        successes += 1
                    else:
                        nonlocal failures
                        failures += 1
                except Exception as e:
                    elapsed = (time.perf_counter() - req_start) * 1000
                    latencies.append(elapsed)
                    failures += 1
        
        tasks = [make_request() for _ in range(num_iterations)]
        await asyncio.gather(*tasks)
        
        elapsed_time = time.time() - start_time
        
        if not latencies:
            raise ValueError("Nenhuma requisição completada")
        
        latencies.sort()
        n = len(latencies)
        
        return TestResult(
            test_name=test_name,
            iterations=num_iterations,
            avg_total_ms=statistics.mean(latencies),
            p50_ms=latencies[int(n * 0.50)],
            p95_ms=latencies[int(n * 0.95)],
            p99_ms=latencies[int(n * 0.99)] if n > 1 else latencies[0],
            min_ms=min(latencies),
            max_ms=max(latencies),
            success_rate=(successes / num_iterations) * 100,
            throughput_rps=num_iterations / elapsed_time if elapsed_time > 0 else 0
        )
    
    def print_results(self, results: List[TestResult]):
        """Imprime resultados formatados"""
        print(f"\n{'='*90}")
        print("RESULTADOS DOS TESTES")
        print(f"{'='*90}\n")
        
        header = (
            f"{'Teste':<30} "
            f"{'RPS':<8} "
            f"{'Avg(ms)':<10} "
            f"{'P50(ms)':<10} "
            f"{'P95(ms)':<10} "
            f"{'P99(ms)':<10} "
            f"{'Sucesso%':<10}"
        )
        print(header)
        print("-" * 90)
        
        for result in results:
            row = (
                f"{result.test_name:<30} "
                f"{result.throughput_rps:>7.1f} "
                f"{result.avg_total_ms:>9.2f} "
                f"{result.p50_ms:>9.2f} "
                f"{result.p95_ms:>9.2f} "
                f"{result.p99_ms:>9.2f} "
                f"{result.success_rate:>9.2f}%"
            )
            print(row)
        
        print(f"\n{'='*90}")
        print("DETALHES POR TESTE")
        print(f"{'='*90}\n")
        
        for result in results:
            print(f"\n{result.test_name}:")
            print(f"  Iterações: {result.iterations}")
            print(f"  Throughput: {result.throughput_rps:.2f} req/s")
            print(f"  Taxa de sucesso: {result.success_rate:.2f}%")
            print(f"  Latência média: {result.avg_total_ms:.2f}ms")
            print(f"  Latência P50: {result.p50_ms:.2f}ms")
            print(f"  Latência P95: {result.p95_ms:.2f}ms")
            print(f"  Latência P99: {result.p99_ms:.2f}ms")
            print(f"  Latência mínima: {result.min_ms:.2f}ms")
            print(f"  Latência máxima: {result.max_ms:.2f}ms")
    
    def compare_with_baseline(self, baseline: TestResult, test: TestResult):
        """Compara um teste com o baseline"""
        print(f"\n{'='*70}")
        print(f"Comparação: {baseline.test_name} vs {test.test_name}")
        print(f"{'='*70}\n")
        
        def calc_change(baseline_val: float, test_val: float) -> Tuple[float, str]:
            if baseline_val == 0:
                return 0.0, "N/A"
            diff = test_val - baseline_val
            pct = (diff / baseline_val) * 100
            direction = "melhorou" if diff < 0 else "piorou"
            return abs(pct), direction
        
        metrics = [
            ("Throughput (RPS)", baseline.throughput_rps, test.throughput_rps, True),
            ("Latência Média (ms)", baseline.avg_total_ms, test.avg_total_ms, False),
            ("Latência P50 (ms)", baseline.p50_ms, test.p50_ms, False),
            ("Latência P95 (ms)", baseline.p95_ms, test.p95_ms, False),
            ("Latência P99 (ms)", baseline.p99_ms, test.p99_ms, False),
        ]
        
        print(f"{'Métrica':<25} {'Baseline':<15} {'Teste':<15} {'Mudança':<15}")
        print("-" * 70)
        
        for metric_name, baseline_val, test_val, higher_is_better in metrics:
            pct, direction = calc_change(baseline_val, test_val)
            
            if higher_is_better:
                is_better = test_val > baseline_val
            else:
                is_better = test_val < baseline_val
            
            symbol = "✓" if is_better else "✗"
            
            print(
                f"{metric_name:<25} "
                f"{baseline_val:>14.2f} "
                f"{test_val:>14.2f} "
                f"{symbol} {pct:>6.2f}% ({direction})"
            )

async def run_optimization_tests():
    """Executa testes de otimizações"""
    print("="*90)
    print("TESTE DE OTIMIZAÇÕES - ORDERS API")
    print("="*90)
    print("\nEste script testa o impacto de diferentes configurações")
    print("Certifique-se de que a API está rodando em http://localhost:8080")
    print("\nPressione Enter para continuar ou Ctrl+C para cancelar...")
    
    try:
        input()
    except KeyboardInterrupt:
        print("\nCancelado pelo usuário")
        return
    
    async with OptimizationTester() as tester:
        results: List[TestResult] = []
        
        # Teste 1: Baseline (baixa concorrência)
        print("\n" + "="*70)
        print("TESTE 1: BASELINE - BAIXA CONCORRÊNCIA")
        print("="*70)
        baseline_low = await tester.test_endpoint(
            test_name="Baseline - Concorrência 1",
            num_iterations=50,
            concurrency=1
        )
        results.append(baseline_low)
        await asyncio.sleep(2)  # Pausa entre testes
        
        # Teste 2: Média concorrência
        print("\n" + "="*70)
        print("TESTE 2: MÉDIA CONCORRÊNCIA")
        print("="*70)
        medium = await tester.test_endpoint(
            test_name="Média Concorrência (5)",
            num_iterations=50,
            concurrency=5
        )
        results.append(medium)
        await asyncio.sleep(2)
        
        # Teste 3: Alta concorrência
        print("\n" + "="*70)
        print("TESTE 3: ALTA CONCORRÊNCIA")
        print("="*70)
        high = await tester.test_endpoint(
            test_name="Alta Concorrência (10)",
            num_iterations=50,
            concurrency=10
        )
        results.append(high)
        await asyncio.sleep(2)
        
        # Teste 4: Muito alta concorrência
        print("\n" + "="*70)
        print("TESTE 4: MUITO ALTA CONCORRÊNCIA")
        print("="*70)
        very_high = await tester.test_endpoint(
            test_name="Muito Alta Concorrência (20)",
            num_iterations=50,
            concurrency=20
        )
        results.append(very_high)
        
        # Imprimir resultados
        tester.print_results(results)
        
        # Comparações
        print("\n" + "="*70)
        print("COMPARAÇÕES")
        print("="*70)
        tester.compare_with_baseline(baseline_low, medium)
        tester.compare_with_baseline(baseline_low, high)
        tester.compare_with_baseline(baseline_low, very_high)
        
        # Salvar resultados
        output_file = "optimization_test_results.json"
        with open(output_file, "w") as f:
            json.dump([asdict(r) for r in results], f, indent=2)
        print(f"\n✓ Resultados salvos em: {output_file}")

if __name__ == "__main__":
    asyncio.run(run_optimization_tests())

