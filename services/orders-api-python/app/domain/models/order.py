# Domain Models and Business Logic
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, validator
from enum import Enum
import json

class OrderStatus(str, Enum):
    """Order status enumeration"""
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class OrderCreateRequest(BaseModel):
    """Request model for creating an order"""
    customer_id: UUID = Field(..., description="Customer identifier")
    product_id: UUID = Field(..., description="Product identifier")
    quantity: int = Field(..., gt=0, le=1000, description="Quantity of items")
    total_amount: float = Field(..., gt=0, description="Total amount for the order")
    
    @validator('total_amount')
    def validate_total_amount(cls, v):
        """Validate total amount precision"""
        if round(v, 2) != v:
            raise ValueError('Total amount must have at most 2 decimal places')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "customer_id": "550e8400-e29b-41d4-a716-446655440000",
                "product_id": "550e8400-e29b-41d4-a716-446655440001", 
                "quantity": 2,
                "total_amount": 99.98
            }
        }

class OrderResponse(BaseModel):
    """Response model for order data"""
    id: UUID = Field(..., description="Unique order identifier")
    customer_id: UUID = Field(..., description="Customer identifier")
    product_id: UUID = Field(..., description="Product identifier")
    quantity: int = Field(..., description="Quantity of items")
    total_amount: float = Field(..., description="Total amount for the order")
    status: OrderStatus = Field(..., description="Current order status")
    created_at: datetime = Field(..., description="Order creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }

class Order(BaseModel):
    """Domain model for Order"""
    id: UUID
    customer_id: UUID
    product_id: UUID
    quantity: int
    total_amount: float
    status: OrderStatus
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def create_new(
        cls,
        customer_id: UUID,
        product_id: UUID,
        quantity: int,
        total_amount: float
    ) -> "Order":
        """Create a new order"""
        now = datetime.utcnow()
        return cls(
            id=uuid4(),
            customer_id=customer_id,
            product_id=product_id,
            quantity=quantity,
            total_amount=total_amount,
            status=OrderStatus.PENDING,
            created_at=now,
            updated_at=now
        )
    
    def update_status(self, new_status: OrderStatus) -> None:
        """Update order status"""
        self.status = new_status
        self.updated_at = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert order to dictionary"""
        return {
            "id": str(self.id),
            "customer_id": str(self.customer_id),
            "product_id": str(self.product_id),
            "quantity": self.quantity,
            "total_amount": self.total_amount,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }

class OutboxEvent(BaseModel):
    """Domain model for Outbox Event"""
    id: UUID
    aggregate_id: UUID
    aggregate_type: str
    event_type: str
    event_data: Dict[str, Any]
    created_at: datetime
    processed_at: Optional[datetime] = None
    status: str = "PENDING"
    retry_count: int = 0
    max_retries: int = 3
    
    @classmethod
    def create_order_created_event(
        cls,
        order: Order,
        trace_id: Optional[str] = None,
        span_id: Optional[str] = None
    ) -> "OutboxEvent":
        """Create order.created event"""
        event_data = {
            "order_id": str(order.id),
            "customer_id": str(order.customer_id),
            "product_id": str(order.product_id),
            "quantity": order.quantity,
            "total_amount": order.total_amount,
            "created_at": order.created_at.isoformat(),
            "trace_id": trace_id,
            "span_id": span_id
        }
        
        return cls(
            id=uuid4(),
            aggregate_id=order.id,
            aggregate_type="Order",
            event_type="order.created",
            event_data=event_data,
            created_at=datetime.utcnow()
        )
    
    def mark_as_processed(self) -> None:
        """Mark event as processed"""
        self.status = "PROCESSED"
        self.processed_at = datetime.utcnow()
    
    def increment_retry(self) -> None:
        """Increment retry count"""
        self.retry_count += 1
        if self.retry_count >= self.max_retries:
            self.status = "FAILED"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary"""
        return {
            "id": str(self.id),
            "aggregate_id": str(self.aggregate_id),
            "aggregate_type": self.aggregate_type,
            "event_type": self.event_type,
            "event_data": json.dumps(self.event_data),
            "created_at": self.created_at.isoformat(),
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
            "status": self.status,
            "retry_count": self.retry_count,
            "max_retries": self.max_retries
        }

class OrderNotFoundError(Exception):
    """Exception raised when order is not found"""
    pass

class InvalidOrderDataError(Exception):
    """Exception raised when order data is invalid"""
    pass

class EventPublishingError(Exception):
    """Exception raised when event publishing fails"""
    pass
