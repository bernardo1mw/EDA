#!/usr/bin/env python3
"""
Profiling detalhado de cada etapa da requisição
Mede tempo de cada componente para identificar gargalos
"""

import asyncio
import time
import httpx
import statistics
from typing import Dict, List, Tuple
from dataclasses import dataclass, asdict
import json
from collections import defaultdict

@dataclass
class TimingBreakdown:
    """Breakdown de tempo de cada etapa"""
    total_ms: float
    http_request_ms: float = 0.0
    validation_ms: float = 0.0
    domain_creation_ms: float = 0.0
    outbox_creation_ms: float = 0.0
    json_serialization_ms: float = 0.0
    db_connection_ms: float = 0.0
    db_transaction_ms: float = 0.0
    db_insert_order_ms: float = 0.0
    db_insert_outbox_ms: float = 0.0
    response_creation_ms: float = 0.0

class DetailedProfiler:
    """Profiler detalhado que mede cada etapa"""
    
    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    async def profile_request(self) -> Tuple[bool, TimingBreakdown]:
        """Faz uma requisição e mede cada etapa"""
        order_data = {
            "customer_id": "customer-001",
            "product_id": "product-001",
            "quantity": 1,
            "total_amount": 49.99
        }
        
        breakdown = TimingBreakdown(total_ms=0.0)
        
        # Tempo total da requisição HTTP
        http_start = time.perf_counter()
        try:
            response = await self.client.post(
                f"{self.base_url}/orders/",
                json=order_data
            )
            http_end = time.perf_counter()
            breakdown.http_request_ms = (http_end - http_start) * 1000
            breakdown.total_ms = breakdown.http_request_ms
            
            success = response.status_code == 201
            
            # Se a resposta incluir headers de timing, extrair
            if "X-Process-Time" in response.headers:
                try:
                    process_time = float(response.headers["X-Process-Time"])
                    breakdown.total_ms = process_time * 1000
                except:
                    pass
            
            return success, breakdown
        except Exception as e:
            http_end = time.perf_counter()
            breakdown.http_request_ms = (http_end - http_start) * 1000
            breakdown.total_ms = breakdown.http_request_ms
            return False, breakdown
    
    async def profile_batch(
        self,
        num_requests: int = 50,
        concurrency: int = 10
    ) -> Dict[str, List[float]]:
        """Executa múltiplas requisições e coleta timings"""
        print(f"\n{'='*80}")
        print(f"Profiling Detalhado")
        print(f"Requisições: {num_requests}, Concorrência: {concurrency}")
        print(f"{'='*80}\n")
        
        # Coletar todos os timings
        timings = defaultdict(list)
        successes = 0
        failures = 0
        
        semaphore = asyncio.Semaphore(concurrency)
        
        async def make_profiled_request():
            async with semaphore:
                success, breakdown = await self.profile_request()
                nonlocal successes, failures
                if success:
                    successes += 1
                else:
                    failures += 1
                
                # Coletar cada métrica
                timings['total'].append(breakdown.total_ms)
                timings['http_request'].append(breakdown.http_request_ms)
        
        # Warmup
        print("Warming up...")
        for _ in range(5):
            await self.profile_request()
        await asyncio.sleep(1)
        
        # Executar requisições
        print(f"Executando {num_requests} requisições com profiling...")
        start_time = time.time()
        
        tasks = [make_profiled_request() for _ in range(num_requests)]
        await asyncio.gather(*tasks)
        
        elapsed_time = time.time() - start_time
        
        return {
            'timings': dict(timings),
            'successes': successes,
            'failures': failures,
            'total_time': elapsed_time,
            'throughput': num_requests / elapsed_time if elapsed_time > 0 else 0
        }
    
    def print_statistics(self, results: Dict):
        """Imprime estatísticas detalhadas"""
        timings = results['timings']
        successes = results['successes']
        failures = results['failures']
        total_time = results['total_time']
        throughput = results['throughput']
        
        print(f"\n{'='*80}")
        print("ESTATÍSTICAS DETALHADAS")
        print(f"{'='*80}\n")
        
        print(f"Requisições: {successes + failures}")
        print(f"Sucesso: {successes}")
        print(f"Falhas: {failures}")
        print(f"Taxa de sucesso: {(successes/(successes+failures)*100) if (successes+failures) > 0 else 0:.2f}%")
        print(f"Tempo total: {total_time:.2f}s")
        print(f"Throughput: {throughput:.2f} req/s\n")
        
        # Estatísticas por métrica
        print(f"{'Métrica':<30} {'Count':<8} {'Avg(ms)':<12} {'Min(ms)':<12} {'Max(ms)':<12} {'P50(ms)':<12} {'P95(ms)':<12} {'P99(ms)':<12}")
        print("-" * 110)
        
        for metric_name, values in sorted(timings.items()):
            if not values:
                continue
            
            values.sort()
            n = len(values)
            
            avg = statistics.mean(values)
            min_val = min(values)
            max_val = max(values)
            p50 = values[int(n * 0.50)]
            p95 = values[int(n * 0.95)] if n > 1 else values[0]
            p99 = values[int(n * 0.99)] if n > 1 else values[0]
            
            print(
                f"{metric_name:<30} "
                f"{n:<8} "
                f"{avg:>11.2f} "
                f"{min_val:>11.2f} "
                f"{max_val:>11.2f} "
                f"{p50:>11.2f} "
                f"{p95:>11.2f} "
                f"{p99:>11.2f}"
            )
        
        # Análise de gargalos
        print(f"\n{'='*80}")
        print("ANÁLISE DE GARGALOS")
        print(f"{'='*80}\n")
        
        if 'total' in timings and timings['total']:
            total_avg = statistics.mean(timings['total'])
            
            print(f"Tempo total médio: {total_avg:.2f}ms\n")
            
            # Identificar componentes que mais contribuem
            print("Componentes medidos:")
            for metric_name, values in sorted(timings.items()):
                if metric_name == 'total':
                    continue
                if values:
                    avg = statistics.mean(values)
                    pct = (avg / total_avg) * 100 if total_avg > 0 else 0
                    print(f"  - {metric_name:<30}: {avg:>8.2f}ms ({pct:>5.1f}% do total)")

async def main():
    """Função principal"""
    print("="*80)
    print("PROFILING DETALHADO - ORDERS API")
    print("="*80)
    print("\nEste script mede o tempo de cada etapa da requisição")
    print("Certifique-se de que a API está rodando em http://localhost:8080")
    print("\nPressione Enter para continuar ou Ctrl+C para cancelar...")
    
    try:
        input()
    except KeyboardInterrupt:
        print("\nCancelado pelo usuário")
        return
    
    async with DetailedProfiler() as profiler:
        # Teste 1: Baixa concorrência
        print("\n" + "="*80)
        print("TESTE 1: BAIXA CONCORRÊNCIA (1)")
        print("="*80)
        results_low = await profiler.profile_batch(num_requests=50, concurrency=1)
        profiler.print_statistics(results_low)
        
        await asyncio.sleep(2)
        
        # Teste 2: Média concorrência
        print("\n" + "="*80)
        print("TESTE 2: MÉDIA CONCORRÊNCIA (5)")
        print("="*80)
        results_medium = await profiler.profile_batch(num_requests=50, concurrency=5)
        profiler.print_statistics(results_medium)
        
        await asyncio.sleep(2)
        
        # Teste 3: Alta concorrência
        print("\n" + "="*80)
        print("TESTE 3: ALTA CONCORRÊNCIA (10)")
        print("="*80)
        results_high = await profiler.profile_batch(num_requests=50, concurrency=10)
        profiler.print_statistics(results_high)
        
        await asyncio.sleep(2)
        
        # Teste 4: Muito alta concorrência
        print("\n" + "="*80)
        print("TESTE 4: MUITO ALTA CONCORRÊNCIA (20)")
        print("="*80)
        results_very_high = await profiler.profile_batch(num_requests=50, concurrency=20)
        profiler.print_statistics(results_very_high)
        
        # Salvar resultados
        output_file = "detailed_profiling_results.json"
        with open(output_file, "w") as f:
            json.dump({
                'low_concurrency': {k: v for k, v in results_low.items() if k != 'timings'},
                'medium_concurrency': {k: v for k, v in results_medium.items() if k != 'timings'},
                'high_concurrency': {k: v for k, v in results_high.items() if k != 'timings'},
                'very_high_concurrency': {k: v for k, v in results_very_high.items() if k != 'timings'},
            }, f, indent=2)
        print(f"\n✓ Resultados salvos em: {output_file}")

if __name__ == "__main__":
    asyncio.run(main())

