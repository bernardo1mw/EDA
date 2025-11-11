# Application Use Cases (Business Logic)
from typing import Optional
from uuid import UUID
import logging

from app.domain.models.order import Order, OrderCreateRequest, OrderResponse, OrderNotFoundError, InvalidOrderDataError, OutboxEvent
from app.domain.interfaces.repositories import OrderRepositoryInterface, ProductRepositoryInterface
from app.core.logging import LoggerMixin
from app.core.profiling import profiler

logger = logging.getLogger(__name__)

class CreateOrderUseCase(LoggerMixin):
    """Use case for creating a new order with Outbox Pattern"""
    
    def __init__(
        self,
        order_repository: OrderRepositoryInterface,
        product_repository: ProductRepositoryInterface
    ):
        self.order_repository = order_repository
        self.product_repository = product_repository
    
    async def execute(
        self,
        request: OrderCreateRequest,
        trace_id: Optional[str] = None,
        span_id: Optional[str] = None
    ) -> OrderResponse:
        """Execute order creation use case with Transactional Outbox Pattern"""
        
        try:
            # Validate business rules
            with profiler.measure("validation"):
                await self._validate_order_data(request)
            
            # Check product exists (stock will be reserved atomically in the transaction)
            with profiler.measure("product_check"):
                product = await self.product_repository.get_by_id(request.product_id)
                if not product:
                    raise InvalidOrderDataError(f"Product not found: {request.product_id}")
                
                # Note: Stock availability is checked and reserved atomically in create_with_outbox_event
                # This prevents race conditions where stock might be depleted between check and reservation
            
            # Create domain model
            with profiler.measure("domain_creation"):
                order = Order.create_new(
                    customer_id=request.customer_id,
                    product_id=request.product_id,
                    quantity=request.quantity,
                    total_amount=request.total_amount
                )
            
            # Create outbox event for order.created
            with profiler.measure("outbox_creation"):
                outbox_event = OutboxEvent.create_order_created_event(
                    order,
                    trace_id=trace_id,
                    span_id=span_id
                )
            
            # Save order, reserve stock, and outbox event in a single transaction (Transactional Outbox Pattern)
            # This ensures atomicity: either all are saved, or none is
            # Stock is reserved in the same transaction to prevent race conditions
            with profiler.measure("database_transaction"):
                saved_order = await self.order_repository.create_with_outbox_event(
                    order, 
                    outbox_event,
                    product_id=request.product_id,
                    quantity=request.quantity
                )
            
            # OPTIMIZATION: Removed logging from hot path to reduce latency
            # Logging is expensive (json.dumps, string formatting) and adds ~5-15ms per request
            # In production, use structured logging asynchronously or via metrics
            
            # Note: Event will be published asynchronously by outbox-dispatcher service
            # which reads from outbox_events table and publishes to RabbitMQ
            
            # OPTIMIZATION: Direct instantiation instead of from_orm to avoid Pydantic overhead
            with profiler.measure("response_creation"):
                response = OrderResponse(
                    id=saved_order.id,
                    customer_id=saved_order.customer_id,
                    product_id=saved_order.product_id,
                    quantity=saved_order.quantity,
                    total_amount=saved_order.total_amount,
                    status=saved_order.status,
                    created_at=saved_order.created_at,
                    updated_at=saved_order.updated_at
                )
            return response
            
        except InvalidOrderDataError as e:
            self.log_error(
                "Invalid order data",
                error=str(e),
                customer_id=str(request.customer_id),
                product_id=str(request.product_id),
                trace_id=trace_id,
                span_id=span_id,
                operation="create_order"
            )
            raise
        except Exception as e:
            self.log_error(
                "Failed to create order",
                error=str(e),
                customer_id=str(request.customer_id),
                product_id=str(request.product_id),
                trace_id=trace_id,
                span_id=span_id,
                operation="create_order"
            )
            raise
    
    async def _validate_order_data(self, request: OrderCreateRequest) -> None:
        """Validate order data against business rules - Optimized for performance"""
        
        # OPTIMIZATION: Fast-path validation - check most common cases first
        # Use short-circuit evaluation to avoid unnecessary checks
        
        # Check quantity limits first (most common validation)
        if request.quantity <= 0:
            raise InvalidOrderDataError("Quantity must be greater than 0")
        if request.quantity > 1000:  # Business rule: max 1000 items per order
            raise InvalidOrderDataError("Quantity cannot exceed 1000 items")

        # Check amount limits
        if request.total_amount <= 0:
            raise InvalidOrderDataError("Total amount must be greater than 0")
        if request.total_amount > 100000:  # Business rule: max $100,000 per order
            raise InvalidOrderDataError("Total amount cannot exceed $100,000")

        # Check IDs - UUIDs are validated by Pydantic, just check they're not None
        if not request.customer_id:
            raise InvalidOrderDataError("Customer ID is required")
        if not request.product_id:
            raise InvalidOrderDataError("Product ID is required")

class GetOrderUseCase(LoggerMixin):
    """Use case for getting an order by ID"""
    
    def __init__(self, order_repository: OrderRepositoryInterface):
        self.order_repository = order_repository
    
    async def execute(
        self,
        order_id: UUID,
        trace_id: Optional[str] = None,
        span_id: Optional[str] = None
    ) -> OrderResponse:
        """Execute get order use case"""
        
        try:
            order = await self.order_repository.get_by_id(order_id)
            
            if not order:
                self.log_warning(
                    "Order not found",
                    order_id=str(order_id),
                    trace_id=trace_id,
                    span_id=span_id,
                    operation="get_order"
                )
                raise OrderNotFoundError(f"Order with ID {order_id} not found")
            
            self.log_info(
                "Order retrieved successfully",
                order_id=str(order.id),
                customer_id=str(order.customer_id),
                status=order.status.value,
                trace_id=trace_id,
                span_id=span_id,
                operation="get_order"
            )
            
            return OrderResponse(
                id=order.id,
                customer_id=order.customer_id,
                product_id=order.product_id,
                quantity=order.quantity,
                total_amount=order.total_amount,
                status=order.status,
                created_at=order.created_at,
                updated_at=order.updated_at
            )
            
        except OrderNotFoundError:
            raise
        except Exception as e:
            self.log_error(
                "Failed to get order",
                error=str(e),
                order_id=str(order_id),
                trace_id=trace_id,
                span_id=span_id,
                operation="get_order"
            )
            raise

class ListOrdersUseCase(LoggerMixin):
    """Use case for listing orders by customer"""
    
    def __init__(self, order_repository: OrderRepositoryInterface):
        self.order_repository = order_repository
    
    async def execute(
        self,
        customer_id: UUID,
        limit: int = 100,
        offset: int = 0,
        trace_id: Optional[str] = None,
        span_id: Optional[str] = None
    ) -> list[OrderResponse]:
        """Execute list orders use case"""
        
        try:
            orders = await self.order_repository.list_by_customer(
                customer_id=customer_id,
                limit=limit,
                offset=offset
            )
            
            self.log_info(
                "Orders listed successfully",
                customer_id=str(customer_id),
                count=len(orders),
                limit=limit,
                offset=offset,
                trace_id=trace_id,
                span_id=span_id,
                operation="list_orders"
            )
            
            return [
                OrderResponse(
                    id=order.id,
                    customer_id=order.customer_id,
                    product_id=order.product_id,
                    quantity=order.quantity,
                    total_amount=order.total_amount,
                    status=order.status,
                    created_at=order.created_at,
                    updated_at=order.updated_at
                )
                for order in orders
            ]
            
        except Exception as e:
            self.log_error(
                "Failed to list orders",
                error=str(e),
                customer_id=str(customer_id),
                trace_id=trace_id,
                span_id=span_id,
                operation="list_orders"
            )
            raise

class ListAllOrdersUseCase(LoggerMixin):
    """Use case for listing all orders"""
    
    def __init__(self, order_repository: OrderRepositoryInterface):
        self.order_repository = order_repository
    
    async def execute(
        self,
        limit: int = 100,
        offset: int = 0,
        trace_id: Optional[str] = None,
        span_id: Optional[str] = None
    ) -> list[OrderResponse]:
        """Execute list all orders use case"""
        
        try:
            orders = await self.order_repository.list_all(
                limit=limit,
                offset=offset
            )
            
            self.log_info(
                "All orders listed successfully",
                count=len(orders),
                limit=limit,
                offset=offset,
                trace_id=trace_id,
                span_id=span_id,
                operation="list_all_orders"
            )
            
            return [
                OrderResponse(
                    id=order.id,
                    customer_id=order.customer_id,
                    product_id=order.product_id,
                    quantity=order.quantity,
                    total_amount=order.total_amount,
                    status=order.status,
                    created_at=order.created_at,
                    updated_at=order.updated_at
                )
                for order in orders
            ]
            
        except Exception as e:
            self.log_error(
                "Failed to list all orders",
                error=str(e),
                trace_id=trace_id,
                span_id=span_id,
                operation="list_all_orders"
            )
            raise
