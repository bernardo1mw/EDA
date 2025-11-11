# Dockerfile for Python Orders API
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser \
    && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8080

# Health check - usando /health/live que não verifica dependências
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health/live || exit 1

# Run the application com otimizações de performance
# - workers: 4 (baseado em CPU cores, ajustar conforme necessário)
# - timeout-keep-alive: 65s (para conexões persistentes)
# - REMOVIDO: --limit-concurrency (era o que causava 503)
#   Antes não tinha limit-concurrency e funcionava bem
#   Com Outbox Pattern, transações são mais lentas (0.3-1.5s vs ~50ms antes)
#   limit-concurrency rejeita requisições quando há muitas simultâneas
#   Sem limite, Uvicorn gerencia naturalmente baseado em recursos do sistema
# - backlog: 2048 (aumentado para suportar picos sem rejeitar)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "4", "--timeout-keep-alive", "65", "--backlog", "2048", "--no-access-log", "--loop", "uvloop"]
