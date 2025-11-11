# Interface Layer - Health Check Routes
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
import logging
from datetime import datetime
from typing import Dict, Any

from app.core.database import db_manager
from app.infrastructure.messaging.publisher import RabbitMQEventPublisher
from app.core.config import settings

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

@router.get(
    "/",
    summary="Health check",
    description="Check if the service is healthy and all dependencies are available",
    responses={
        200: {"description": "Service is healthy"},
        503: {"description": "Service is unhealthy"}
    }
)
async def health_check() -> JSONResponse:
    """Health check endpoint"""
    
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "service": settings.otel_service_name,
        "version": settings.app_version,
        "checks": {}
    }
    
    overall_healthy = True
    
    # Check database connection
    try:
        async with db_manager.get_connection() as conn:
            await conn.fetchval("SELECT 1")
        health_status["checks"]["database"] = {
            "status": "healthy",
            "message": "Database connection successful"
        }
    except Exception as e:
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "message": f"Database connection failed: {str(e)}"
        }
        overall_healthy = False
    
    # Check RabbitMQ connection
    try:
        event_publisher = RabbitMQEventPublisher()
        if not event_publisher.connection or event_publisher.connection.is_closed:
            await event_publisher.connect()
        
        health_status["checks"]["rabbitmq"] = {
            "status": "healthy",
            "message": "RabbitMQ connection successful"
        }
    except Exception as e:
        health_status["checks"]["rabbitmq"] = {
            "status": "unhealthy",
            "message": f"RabbitMQ connection failed: {str(e)}"
        }
        overall_healthy = False
    
    # Set overall status
    if not overall_healthy:
        health_status["status"] = "unhealthy"
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=health_status
        )
    
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=health_status
    )

@router.get(
    "/ready",
    summary="Readiness check",
    description="Check if the service is ready to accept requests",
    responses={
        200: {"description": "Service is ready"},
        503: {"description": "Service is not ready"}
    }
)
async def readiness_check() -> JSONResponse:
    """Readiness check endpoint"""
    
    readiness_status = {
        "status": "ready",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "service": settings.otel_service_name,
        "version": settings.app_version
    }
    
    # For now, if the service is running, it's ready
    # In a more complex scenario, you might check if all required resources are available
    
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=readiness_status
    )

@router.get(
    "/live",
    summary="Liveness check",
    description="Check if the service is alive",
    responses={
        200: {"description": "Service is alive"}
    }
)
async def liveness_check() -> JSONResponse:
    """Liveness check endpoint"""
    
    liveness_status = {
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "service": settings.otel_service_name,
        "version": settings.app_version
    }
    
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=liveness_status
    )
