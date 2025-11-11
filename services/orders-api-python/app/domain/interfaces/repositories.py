# Domain Repository Interfaces
from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from app.domain.models.order import Order, OrderStatus, OutboxEvent
from app.domain.models.product import Product
from app.domain.models.customer import Customer

class OrderRepositoryInterface(ABC):
    """Interface for Order repository"""
    
    @abstractmethod
    async def create(self, order: Order) -> Order:
        """Create a new order"""
        pass
    
    @abstractmethod
    async def get_by_id(self, order_id: UUID) -> Optional[Order]:
        """Get order by ID"""
        pass
    
    @abstractmethod
    async def update(self, order: Order) -> Order:
        """Update an existing order"""
        pass
    
    @abstractmethod
    async def update_status(self, order_id: UUID, new_status: OrderStatus) -> bool:
        """Update order status only"""
        pass
    
    @abstractmethod
    async def delete(self, order_id: UUID) -> bool:
        """Delete an order"""
        pass
    
    @abstractmethod
    async def list_by_customer(self, customer_id: UUID, limit: int = 100, offset: int = 0) -> List[Order]:
        """List orders by customer ID"""
        pass
    
    @abstractmethod
    async def list_all(self, limit: int = 100, offset: int = 0) -> List[Order]:
        """List all orders"""
        pass
    
    @abstractmethod
    async def create_with_outbox_event(self, order: Order, outbox_event: OutboxEvent, product_id: UUID = None, quantity: int = None) -> Order:
        """Create order, reserve stock (if product_id and quantity provided), and outbox event in a single transaction"""
        pass

class OutboxEventRepositoryInterface(ABC):
    """Interface for Outbox Event repository"""
    
    @abstractmethod
    async def create(self, event: OutboxEvent) -> OutboxEvent:
        """Create a new outbox event"""
        pass
    
    @abstractmethod
    async def get_pending_events(self, limit: int = 100) -> List[OutboxEvent]:
        """Get pending events for processing"""
        pass
    
    @abstractmethod
    async def update(self, event: OutboxEvent) -> OutboxEvent:
        """Update an existing event"""
        pass
    
    @abstractmethod
    async def mark_as_processed(self, event_id: UUID) -> bool:
        """Mark event as processed"""
        pass
    
    @abstractmethod
    async def increment_retry(self, event_id: UUID) -> bool:
        """Increment retry count for event"""
        pass

class EventPublisherInterface(ABC):
    """Interface for Event Publisher"""
    
    @abstractmethod
    async def publish_event(self, event: OutboxEvent) -> bool:
        """Publish an event to message broker"""
        pass
    
    @abstractmethod
    async def publish_order_created(self, order: Order, trace_id: Optional[str] = None, span_id: Optional[str] = None) -> bool:
        """Publish order.created event"""
        pass

class ProductRepositoryInterface(ABC):
    """Interface for Product repository"""
    
    @abstractmethod
    async def create(self, product: Product) -> Product:
        """Create a new product"""
        pass
    
    @abstractmethod
    async def get_by_id(self, product_id: UUID) -> Optional[Product]:
        """Get product by ID"""
        pass
    
    @abstractmethod
    async def get_by_sku(self, sku: str) -> Optional[Product]:
        """Get product by SKU"""
        pass
    
    @abstractmethod
    async def update(self, product: Product) -> Product:
        """Update an existing product"""
        pass
    
    @abstractmethod
    async def delete(self, product_id: UUID) -> bool:
        """Delete a product"""
        pass
    
    @abstractmethod
    async def list_all(self, limit: int = 100, offset: int = 0) -> List[Product]:
        """List all products"""
        pass
    
    @abstractmethod
    async def update_stock(self, product_id: UUID, quantity: int) -> bool:
        """Update product stock quantity (add or subtract)"""
        pass
    
    @abstractmethod
    async def reserve_stock(self, product_id: UUID, quantity: int) -> bool:
        """Reserve stock by decreasing quantity. Returns True if successful, False if insufficient stock."""
        pass

class CustomerRepositoryInterface(ABC):
    """Interface for Customer repository"""
    
    @abstractmethod
    async def create(self, customer: Customer) -> Customer:
        """Create a new customer"""
        pass
    
    @abstractmethod
    async def get_by_id(self, customer_id: UUID) -> Optional[Customer]:
        """Get customer by ID"""
        pass
    
    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[Customer]:
        """Get customer by email"""
        pass
    
    @abstractmethod
    async def update(self, customer: Customer) -> Customer:
        """Update an existing customer"""
        pass
    
    @abstractmethod
    async def delete(self, customer_id: UUID) -> bool:
        """Delete a customer"""
        pass
    
    @abstractmethod
    async def list_all(self, limit: int = 100, offset: int = 0) -> List[Customer]:
        """List all customers"""
        pass
