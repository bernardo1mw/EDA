# Core Configuration and Settings
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    app_name: str = "Event Stream Orders API"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Database
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "order_process"
    postgres_user: str = "order_user"
    postgres_password: str = "order_password"
    
    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: Optional[str] = None
    
    # RabbitMQ
    rabbitmq_host: str = "localhost"
    rabbitmq_port: int = 5672
    rabbitmq_user: str = "order_user"
    rabbitmq_password: str = "order_password"
    rabbitmq_vhost: str = "/"
    
    # OpenTelemetry
    otel_exporter_endpoint: str = "http://localhost:4317"
    otel_service_name: str = "orders-api"
    
    # Performance
    min_connections: int = 20
    max_connections: int = 90
    connection_timeout: int = 5
    request_timeout: int = 20
    retry_attempts: int = 1
    retry_delay: int = 500
    
    @property
    def database_url(self) -> str:
        """Get database URL"""
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    
    @property
    def redis_url(self) -> str:
        """Get Redis URL"""
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}"
        return f"redis://{self.redis_host}:{self.redis_port}"
    
    @property
    def rabbitmq_url(self) -> str:
        """Get RabbitMQ URL"""
        return f"amqp://{self.rabbitmq_user}:{self.rabbitmq_password}@{self.rabbitmq_host}:{self.rabbitmq_port}{self.rabbitmq_vhost}"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Global settings instance
settings = Settings()
