# Interface Layer - Health Check Routes
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any

_start_time = time.time()

from app.core.database import db_manager
import aio_pika
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
        "timestamp": datetime.now(timezone.utc).isoformat(),
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
        conn = await aio_pika.connect_robust(settings.rabbitmq_url, timeout=5)
        await conn.close()
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
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": settings.otel_service_name,
        "version": settings.app_version,
        "checks": {}
    }

    overall_ready = True

    # Check database pool
    try:
        async with db_manager.get_connection() as conn:
            await conn.fetchval("SELECT 1")
        readiness_status["checks"]["database"] = {
            "status": "healthy",
            "message": "Database connection successful"
        }
    except Exception as e:
        readiness_status["checks"]["database"] = {
            "status": "unhealthy",
            "message": f"Database connection failed: {str(e)}"
        }
        overall_ready = False

    # Check RabbitMQ connection
    try:
        conn = await aio_pika.connect_robust(settings.rabbitmq_url, timeout=5)
        await conn.close()
        readiness_status["checks"]["rabbitmq"] = {
            "status": "healthy",
            "message": "RabbitMQ connection successful"
        }
    except Exception as e:
        readiness_status["checks"]["rabbitmq"] = {
            "status": "unhealthy",
            "message": f"RabbitMQ connection failed: {str(e)}"
        }
        overall_ready = False

    if not overall_ready:
        readiness_status["status"] = "not ready"
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=readiness_status
        )

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
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": settings.otel_service_name,
        "version": settings.app_version,
        "uptime_seconds": round(time.time() - _start_time, 2)
    }

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=liveness_status
    )
