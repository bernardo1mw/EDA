#!/usr/bin/env python3
"""
Script de benchmark para testar performance e impacto de otimizações
Testa cada otimização isoladamente e compara resultados
"""

import asyncio
import time
import statistics
from typing import List, Dict, Any
import httpx
import json
from dataclasses import dataclass
from contextlib import asynccontextmanager

@dataclass
class BenchmarkResult:
    """Resultado de um benchmark"""
    name: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_latency_ms: float
    p50_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    min_latency_ms: float
    max_latency_ms: float
    throughput_rps: float
    error_rate: float

class PerformanceBenchmark:
    """Classe para executar benchmarks de performance"""
    
    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    async def create_order(self, order_data: Dict[str, Any]) -> tuple[bool, float]:
        """Cria uma ordem e retorna (sucesso, latência_ms)"""
        start_time = time.perf_counter()
        try:
            response = await self.client.post(
                f"{self.base_url}/orders/",
                json=order_data
            )
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            
            if response.status_code == 201:
                return True, elapsed_ms
            else:
                return False, elapsed_ms
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            print(f"Erro ao criar ordem: {e}")
            return False, elapsed_ms
    
    async def run_benchmark(
        self,
        name: str,
        num_requests: int = 100,
        concurrency: int = 10,
        warmup_requests: int = 10
    ) -> BenchmarkResult:
        """Executa um benchmark com configuração específica"""
        print(f"\n{'='*60}")
        print(f"Benchmark: {name}")
        print(f"Requests: {num_requests}, Concurrency: {concurrency}")
        print(f"{'='*60}")
        
        # Warmup
        if warmup_requests > 0:
            print(f"Warming up with {warmup_requests} requests...")
            warmup_data = {
                "customer_id": "customer-001",
                "product_id": "product-001",
                "quantity": 1,
                "total_amount": 49.99
            }
            for _ in range(warmup_requests):
                await self.create_order(warmup_data)
            await asyncio.sleep(1)  # Pequena pausa após warmup
        
        # Benchmark real
        latencies: List[float] = []
        successful = 0
        failed = 0
        
        order_data = {
            "customer_id": "customer-001",
            "product_id": "product-001",
            "quantity": 1,
            "total_amount": 49.99
        }
        
        print(f"Executando {num_requests} requisições com concorrência {concurrency}...")
        start_time = time.time()
        
        # Criar semáforo para limitar concorrência
        semaphore = asyncio.Semaphore(concurrency)
        
        async def make_request():
            async with semaphore:
                success, latency = await self.create_order(order_data)
                latencies.append(latency)
                if success:
                    nonlocal successful
                    successful += 1
                else:
                    nonlocal failed
                    failed += 1
        
        # Criar todas as tasks
        tasks = [make_request() for _ in range(num_requests)]
        await asyncio.gather(*tasks)
        
        elapsed_time = time.time() - start_time
        
        # Calcular estatísticas
        if not latencies:
            raise ValueError("Nenhuma requisição foi completada")
        
        latencies.sort()
        n = len(latencies)
        
        result = BenchmarkResult(
            name=name,
            total_requests=num_requests,
            successful_requests=successful,
            failed_requests=failed,
            avg_latency_ms=statistics.mean(latencies),
            p50_latency_ms=latencies[int(n * 0.50)],
            p95_latency_ms=latencies[int(n * 0.95)],
            p99_latency_ms=latencies[int(n * 0.99)] if n > 1 else latencies[0],
            min_latency_ms=min(latencies),
            max_latency_ms=max(latencies),
            throughput_rps=num_requests / elapsed_time if elapsed_time > 0 else 0,
            error_rate=(failed / num_requests) * 100 if num_requests > 0 else 0
        )
        
        return result
    
    def print_results(self, results: List[BenchmarkResult]):
        """Imprime resultados formatados"""
        print(f"\n{'='*80}")
        print("RESULTADOS DO BENCHMARK")
        print(f"{'='*80}\n")
        
        # Cabeçalho
        header = f"{'Nome':<30} {'RPS':<8} {'Avg':<8} {'P50':<8} {'P95':<8} {'P99':<8} {'Erros':<8}"
        print(header)
        print("-" * 80)
        
        # Dados
        for result in results:
            row = (
                f"{result.name:<30} "
                f"{result.throughput_rps:>7.1f} "
                f"{result.avg_latency_ms:>7.1f} "
                f"{result.p50_latency_ms:>7.1f} "
                f"{result.p95_latency_ms:>7.1f} "
                f"{result.p99_latency_ms:>7.1f} "
                f"{result.error_rate:>6.2f}%"
            )
            print(row)
        
        print(f"\n{'='*80}")
        print("DETALHES POR CONFIGURAÇÃO")
        print(f"{'='*80}\n")
        
        for result in results:
            print(f"\n{result.name}:")
            print(f"  Total de requisições: {result.total_requests}")
            print(f"  Sucesso: {result.successful_requests}")
            print(f"  Falhas: {result.failed_requests}")
            print(f"  Taxa de erro: {result.error_rate:.2f}%")
            print(f"  Throughput: {result.throughput_rps:.2f} req/s")
            print(f"  Latência média: {result.avg_latency_ms:.2f}ms")
            print(f"  Latência P50: {result.p50_latency_ms:.2f}ms")
            print(f"  Latência P95: {result.p95_latency_ms:.2f}ms")
            print(f"  Latência P99: {result.p99_latency_ms:.2f}ms")
            print(f"  Latência mínima: {result.min_latency_ms:.2f}ms")
            print(f"  Latência máxima: {result.max_latency_ms:.2f}ms")
    
    def compare_results(self, baseline: BenchmarkResult, optimized: BenchmarkResult):
        """Compara dois resultados e mostra a diferença"""
        print(f"\n{'='*80}")
        print(f"COMPARAÇÃO: {baseline.name} vs {optimized.name}")
        print(f"{'='*80}\n")
        
        def calc_improvement(baseline_val: float, optimized_val: float) -> tuple[float, str]:
            if baseline_val == 0:
                return 0.0, "N/A"
            diff = optimized_val - baseline_val
            pct = (diff / baseline_val) * 100
            direction = "melhorou" if diff < 0 else "piorou"
            return abs(pct), direction
        
        metrics = [
            ("Throughput (RPS)", baseline.throughput_rps, optimized.throughput_rps, True),
            ("Latência Média (ms)", baseline.avg_latency_ms, optimized.avg_latency_ms, False),
            ("Latência P50 (ms)", baseline.p50_latency_ms, optimized.p50_latency_ms, False),
            ("Latência P95 (ms)", baseline.p95_latency_ms, optimized.p95_latency_ms, False),
            ("Latência P99 (ms)", baseline.p99_latency_ms, optimized.p99_latency_ms, False),
            ("Taxa de Erro (%)", baseline.error_rate, optimized.error_rate, False),
        ]
        
        print(f"{'Métrica':<25} {'Baseline':<15} {'Otimizado':<15} {'Diferença':<15}")
        print("-" * 70)
        
        for metric_name, baseline_val, optimized_val, higher_is_better in metrics:
            pct, direction = calc_improvement(baseline_val, optimized_val)
            
            if higher_is_better:
                is_better = optimized_val > baseline_val
            else:
                is_better = optimized_val < baseline_val
            
            if is_better:
                symbol = "✓"
            else:
                symbol = "✗"
            
            print(
                f"{metric_name:<25} "
                f"{baseline_val:>14.2f} "
                f"{optimized_val:>14.2f} "
                f"{symbol} {pct:>6.2f}% ({direction})"
            )

async def main():
    """Função principal do benchmark"""
    print("="*80)
    print("BENCHMARK DE PERFORMANCE - ORDERS API")
    print("="*80)
    print("\nEste script testa o impacto de diferentes otimizações")
    print("Certifique-se de que a API está rodando em http://localhost:8080")
    print("\nPressione Enter para continuar ou Ctrl+C para cancelar...")
    
    try:
        input()
    except KeyboardInterrupt:
        print("\nCancelado pelo usuário")
        return
    
    async with PerformanceBenchmark() as benchmark:
        results: List[BenchmarkResult] = []
        
        # Teste 1: Baseline (estado atual)
        print("\n" + "="*80)
        print("TESTE 1: BASELINE (Estado Atual)")
        print("="*80)
        baseline = await benchmark.run_benchmark(
            name="Baseline (Estado Atual)",
            num_requests=100,
            concurrency=10
        )
        results.append(baseline)
        
        # Teste 2: Menor concorrência (para verificar se é problema de contenção)
        print("\n" + "="*80)
        print("TESTE 2: BAIXA CONCORRÊNCIA")
        print("="*80)
        low_concurrency = await benchmark.run_benchmark(
            name="Baixa Concorrência (1)",
            num_requests=100,
            concurrency=1
        )
        results.append(low_concurrency)
        
        # Teste 3: Média concorrência
        print("\n" + "="*80)
        print("TESTE 3: MÉDIA CONCORRÊNCIA")
        print("="*80)
        medium_concurrency = await benchmark.run_benchmark(
            name="Média Concorrência (5)",
            num_requests=100,
            concurrency=5
        )
        results.append(medium_concurrency)
        
        # Teste 4: Alta concorrência
        print("\n" + "="*80)
        print("TESTE 4: ALTA CONCORRÊNCIA")
        print("="*80)
        high_concurrency = await benchmark.run_benchmark(
            name="Alta Concorrência (20)",
            num_requests=100,
            concurrency=20
        )
        results.append(high_concurrency)
        
        # Imprimir todos os resultados
        benchmark.print_results(results)
        
        # Comparar baseline com outros
        print("\n" + "="*80)
        print("COMPARAÇÕES COM BASELINE")
        print("="*80)
        benchmark.compare_results(baseline, low_concurrency)
        benchmark.compare_results(baseline, medium_concurrency)
        benchmark.compare_results(baseline, high_concurrency)
        
        # Salvar resultados em JSON
        output_file = "benchmark_results.json"
        with open(output_file, "w") as f:
            json.dump(
                [result.__dict__ for result in results],
                f,
                indent=2
            )
        print(f"\nResultados salvos em: {output_file}")

if __name__ == "__main__":
    asyncio.run(main())

