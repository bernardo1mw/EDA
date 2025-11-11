# Database Configuration and Connection Management
import asyncpg
import asyncio
from typing import Optional
from contextlib import asynccontextmanager
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Database connection manager"""
    
    def __init__(self):
        self._pool: Optional[asyncpg.Pool] = None
    
    async def create_pool(self) -> asyncpg.Pool:
        """Create database connection pool"""
        if self._pool is None:
            # Otimizações de performance:
            # - min_size maior para reduzir latência de criação de conexões
            # - max_size baseado em configuração (padrão 100)
            # - command_timeout reduzido para queries rápidas (5s)
            # - JIT desabilitado para melhor performance
            # - Statement cache habilitado para queries repetidas
            self._pool = await asyncpg.create_pool(
                settings.database_url,
                min_size=settings.min_connections,
                max_size=settings.max_connections,
                command_timeout=10,  # 10s timeout para transações - balanceado entre evitar esperas longas e permitir transações legítimas
                max_queries=10000,  # Cache de queries preparadas
                max_inactive_connection_lifetime=300,  # 5 minutos
                timeout=30,  # 30s timeout para criar pool - necessário para múltiplos workers criando conexões simultaneamente
            )
            logger.info(
                f"Database connection pool created: min={settings.min_connections}, "
                f"max={settings.max_connections}, command_timeout=10s"
            )
        return self._pool
    
    async def close_pool(self):
        """Close database connection pool"""
        if self._pool:
            await self._pool.close()
            self._pool = None
            logger.info("Database connection pool closed")
    
    @asynccontextmanager
    async def get_connection(self):
        """Get database connection from pool with retry logic"""
        if self._pool is None:
            await self.create_pool()
        
        # Tentar adquirir conexão com timeout apropriado
        # Se houver TooManyConnectionsError, aguardar um pouco e retentar
        max_retries = 3
        retry_delay = 0.1  # 100ms
        
        for attempt in range(max_retries):
            try:
                async with self._pool.acquire() as connection:
                    yield connection
                    return
            except asyncpg.exceptions.TooManyConnectionsError as e:
                if attempt < max_retries - 1:
                    logger.warning(
                        f"Too many connections, retrying in {retry_delay}s "
                        f"(attempt {attempt + 1}/{max_retries})"
                    )
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    logger.error(
                        f"Failed to acquire connection after {max_retries} attempts: {e}"
                    )
                    raise
    
    async def execute_query(self, query: str, *args):
        """Execute a query"""
        async with self.get_connection() as conn:
            return await conn.fetch(query, *args)
    
    async def execute_one(self, query: str, *args):
        """Execute a query and return one result"""
        async with self.get_connection() as conn:
            return await conn.fetchrow(query, *args)
    
    async def execute_command(self, query: str, *args):
        """Execute a command (INSERT, UPDATE, DELETE)"""
        async with self.get_connection() as conn:
            return await conn.execute(query, *args)

# Global database manager
db_manager = DatabaseManager()

async def init_db():
    """Initialize database connection"""
    await db_manager.create_pool()
    
    # Test connection
    try:
        async with db_manager.get_connection() as conn:
            await conn.fetchval("SELECT 1")
        logger.info("Database connection test successful")
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        raise

async def close_db():
    """Close database connection"""
    await db_manager.close_pool()
