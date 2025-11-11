"""
Profiling endpoint para retornar dados de profiling
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.core.profiling import profiler

router = APIRouter()

@router.get("/profiling/stats")
async def get_profiling_stats():
    """Retorna estatísticas de profiling"""
    if not profiler.enabled:
        return JSONResponse(
            status_code=200,
            content={
                "enabled": False,
                "message": "Profiling is not enabled. Set ENABLE_PROFILING=true"
            }
        )
    
    stats = profiler.get_statistics()
    return JSONResponse(
        status_code=200,
        content={
            "enabled": True,
            "statistics": stats
        }
    )

@router.post("/profiling/reset")
async def reset_profiling():
    """Reseta os dados de profiling"""
    profiler.reset()
    return JSONResponse(
        status_code=200,
        content={"message": "Profiling data reset"}
    )

