# Event Stream Orders API - Python + FastAPI
# Clean Architecture Implementation

from fastapi import FastAPI, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import uvicorn
import logging
import time
from contextlib import asynccontextmanager

from app.core.database import init_db
from app.core.logging import setup_logging
from app.core.config import settings
from app.interfaces.api.routes import orders, health, profiling, products, customers
from app.infrastructure.database.repositories import OrderRepository, ProductRepository
from app.application.services.order_service import OrderService
from app.infrastructure.messaging.inventory_consumer import InventoryEventConsumer

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

class PerformanceMiddleware(BaseHTTPMiddleware):
    """Middleware para monitorar performance de requisições"""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Processar requisição
        response = await call_next(request)
        
        # Calcular latência
        process_time = time.time() - start_time
        
        # Log apenas para requisições lentas (>200ms) ou erros
        if process_time > 0.2 or response.status_code >= 400:
            logger.warning(
                f"Request performance: {request.method} {request.url.path} - "
                f"Status: {response.status_code}, Time: {process_time:.3f}s"
            )
        
        # Adicionar header de latência
        response.headers["X-Process-Time"] = str(process_time)
        
        return response

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting Event Stream Orders API")
    await init_db()
    logger.info("Database initialized")
    
    # Start inventory event consumer
    order_repository = OrderRepository()
    inventory_consumer = InventoryEventConsumer(order_repository)
    try:
        await inventory_consumer.connect(settings.rabbitmq_url)
        await inventory_consumer.start_consuming()
        logger.info("Inventory event consumer started")
    except Exception as e:
        logger.error(f"Failed to start inventory consumer: {e}", exc_info=True)
    
    yield
    
    # Shutdown
    logger.info("Shutting down Event Stream Orders API")
    try:
        await inventory_consumer.disconnect()
    except Exception as e:
        logger.error(f"Error disconnecting inventory consumer: {e}", exc_info=True)

# Create FastAPI application
app = FastAPI(
    title="Event Stream Orders API",
    description="High-performance order processing API with event-driven architecture",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add performance monitoring middleware
app.add_middleware(PerformanceMiddleware)

# Dependency injection
def get_order_service() -> OrderService:
    """Dependency injection for OrderService
    
    Note: OrderService now uses Transactional Outbox Pattern.
    Events are saved to outbox_events table in the same transaction as the order,
    and then processed asynchronously by the outbox-dispatcher service.
    """
    order_repository = OrderRepository()
    product_repository = ProductRepository()
    return OrderService(order_repository, product_repository)

# Include routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(orders.router, prefix="/orders", tags=["orders"])
app.include_router(products.router, prefix="/products", tags=["products"])
app.include_router(customers.router, prefix="/customers", tags=["customers"])
app.include_router(profiling.router, prefix="/profiling", tags=["profiling"])

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
        log_level="info"
    )
