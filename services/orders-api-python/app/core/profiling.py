"""
Módulo de profiling para medir tempo de cada etapa
Pode ser habilitado via variável de ambiente ENABLE_PROFILING=true
"""

import time
import os
from typing import Dict, List, Optional
from contextlib import contextmanager
from collections import defaultdict
import json

ENABLE_PROFILING = os.getenv("ENABLE_PROFILING", "false").lower() == "true"

class Profiler:
    """Profiler para medir tempos de execução"""
    
    def __init__(self):
        self.enabled = ENABLE_PROFILING
        self.timings: Dict[str, List[float]] = defaultdict(list)
        self.current_request_id: Optional[str] = None
        self.request_timings: Dict[str, Dict[str, float]] = {}
    
    def reset(self):
        """Reseta os timings"""
        self.timings.clear()
        self.request_timings.clear()
    
    @contextmanager
    def measure(self, operation: str):
        """Context manager para medir tempo de uma operação"""
        if not self.enabled:
            yield
            return
        
        start = time.perf_counter()
        try:
            yield
        finally:
            elapsed = (time.perf_counter() - start) * 1000  # ms
            self.timings[operation].append(elapsed)
            
            if self.current_request_id:
                if self.current_request_id not in self.request_timings:
                    self.request_timings[self.current_request_id] = {}
                self.request_timings[self.current_request_id][operation] = elapsed
    
    def start_request(self, request_id: str):
        """Inicia medição de uma requisição"""
        if self.enabled:
            self.current_request_id = request_id
            self.request_timings[request_id] = {}
    
    def end_request(self, request_id: str):
        """Finaliza medição de uma requisição"""
        if self.enabled:
            self.current_request_id = None
    
    def get_statistics(self) -> Dict[str, Dict[str, float]]:
        """Retorna estatísticas agregadas"""
        stats = {}
        for operation, values in self.timings.items():
            if values:
                stats[operation] = {
                    'count': len(values),
                    'total': sum(values),
                    'avg': sum(values) / len(values),
                    'min': min(values),
                    'max': max(values),
                    'p50': sorted(values)[int(len(values) * 0.50)],
                    'p95': sorted(values)[int(len(values) * 0.95)],
                    'p99': sorted(values)[int(len(values) * 0.99)] if len(values) > 1 else values[0],
                }
        return stats
    
    def get_request_timings(self, request_id: str) -> Dict[str, float]:
        """Retorna timings de uma requisição específica"""
        return self.request_timings.get(request_id, {})
    
    def export_to_json(self, filename: str = "profiling_results.json"):
        """Exporta resultados para JSON"""
        with open(filename, "w") as f:
            json.dump({
                'statistics': self.get_statistics(),
                'request_timings': self.request_timings
            }, f, indent=2)

# Global profiler instance
profiler = Profiler()

