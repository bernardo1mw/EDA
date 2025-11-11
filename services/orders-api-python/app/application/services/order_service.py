# Application Service Layer
from typing import Optional
from uuid import UUID

from app.domain.models.order import Order, OrderCreateRequest, OrderResponse
from app.domain.interfaces.repositories import OrderRepositoryInterface, ProductRepositoryInterface
from app.application.use_cases.order_use_cases import CreateOrderUseCase, GetOrderUseCase, ListOrdersUseCase

class OrderService:
    """Application service for order operations"""
    
    def __init__(
        self,
        order_repository: OrderRepositoryInterface,
        product_repository: ProductRepositoryInterface
    ):
        self.order_repository = order_repository
        self.product_repository = product_repository
        
        # Initialize use cases
        # CreateOrderUseCase now uses Transactional Outbox Pattern
        # Events are saved to outbox_events table and processed by outbox-dispatcher service
        self.create_order_use_case = CreateOrderUseCase(order_repository, product_repository)
        self.get_order_use_case = GetOrderUseCase(order_repository)
        self.list_orders_use_case = ListOrdersUseCase(order_repository)
    
    async def create_order(
        self,
        request: OrderCreateRequest,
        trace_id: Optional[str] = None,
        span_id: Optional[str] = None
    ) -> OrderResponse:
        """Create a new order"""
        return await self.create_order_use_case.execute(request, trace_id, span_id)
    
    async def get_order(
        self,
        order_id: UUID,
        trace_id: Optional[str] = None,
        span_id: Optional[str] = None
    ) -> OrderResponse:
        """Get order by ID"""
        return await self.get_order_use_case.execute(order_id, trace_id, span_id)
    
    async def list_orders_by_customer(
        self,
        customer_id: str,
        limit: int = 100,
        offset: int = 0,
        trace_id: Optional[str] = None,
        span_id: Optional[str] = None
    ) -> list[OrderResponse]:
        """List orders by customer"""
        return await self.list_orders_use_case.execute(customer_id, limit, offset, trace_id, span_id)
