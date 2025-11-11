# Logging Configuration
import logging
import sys
from typing import Dict, Any
import json
from datetime import datetime
import traceback

from app.core.config import settings

class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured JSON logs"""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as structured JSON"""
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "service": settings.otel_service_name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add extra fields if present
        if hasattr(record, 'trace_id'):
            log_data["trace_id"] = record.trace_id
        if hasattr(record, 'span_id'):
            log_data["span_id"] = record.span_id
        if hasattr(record, 'order_id'):
            log_data["order_id"] = record.order_id
        if hasattr(record, 'customer_id'):
            log_data["customer_id"] = record.customer_id
        if hasattr(record, 'operation'):
            log_data["operation"] = record.operation
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exception(*record.exc_info)
            }
        
        return json.dumps(log_data, ensure_ascii=False)

def setup_logging():
    """Setup application logging"""
    
    # Create logger
    logger = logging.getLogger()
    logger.setLevel(logging.INFO if not settings.debug else logging.DEBUG)
    
    # Remove existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    
    # Set formatter
    formatter = StructuredFormatter()
    console_handler.setFormatter(formatter)
    
    # Add handler to logger
    logger.addHandler(console_handler)
    
    # Set specific loggers
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("asyncpg").setLevel(logging.WARNING)
    logging.getLogger("aioredis").setLevel(logging.WARNING)
    logging.getLogger("aio_pika").setLevel(logging.WARNING)

class LoggerMixin:
    """Mixin class for adding logging capabilities"""
    
    @property
    def logger(self) -> logging.Logger:
        """Get logger for this class"""
        return logging.getLogger(self.__class__.__name__)
    
    def log_info(self, message: str, **kwargs):
        """Log info message with extra fields"""
        extra = {k: v for k, v in kwargs.items()}
        self.logger.info(message, extra=extra)
    
    def log_error(self, message: str, **kwargs):
        """Log error message with extra fields"""
        extra = {k: v for k, v in kwargs.items()}
        self.logger.error(message, extra=extra)
    
    def log_warning(self, message: str, **kwargs):
        """Log warning message with extra fields"""
        extra = {k: v for k, v in kwargs.items()}
        self.logger.warning(message, extra=extra)
    
    def log_debug(self, message: str, **kwargs):
        """Log debug message with extra fields"""
        extra = {k: v for k, v in kwargs.items()}
        self.logger.debug(message, extra=extra)
