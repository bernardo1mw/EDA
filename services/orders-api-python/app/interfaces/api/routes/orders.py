# Interface Layer - API Routes
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from typing import List
from uuid import UUID
import logging
from pydantic import ValidationError

from app.domain.models.order import OrderCreateRequest, OrderResponse, OrderNotFoundError, InvalidOrderDataError
from app.domain.models.product import InsufficientStockError
from app.application.use_cases.order_use_cases import CreateOrderUseCase, GetOrderUseCase, ListOrdersUseCase, ListAllOrdersUseCase
from app.infrastructure.database.repositories import OrderRepository, ProductRepository
from app.core.logging import LoggerMixin

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

class OrderController(LoggerMixin):
    """Controller for order operations"""
    
    def __init__(self):
        self.order_repository = OrderRepository()
        self.product_repository = ProductRepository()
        # CreateOrderUseCase now uses Transactional Outbox Pattern
        # Events are saved to outbox_events table and processed by outbox-dispatcher service
        self.create_order_use_case = CreateOrderUseCase(self.order_repository, self.product_repository)
        self.get_order_use_case = GetOrderUseCase(self.order_repository)
        self.list_orders_use_case = ListOrdersUseCase(self.order_repository)
        self.list_all_orders_use_case = ListAllOrdersUseCase(self.order_repository)

# Global controller instance
order_controller = OrderController()

@router.post(
    "/",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new order",
    description="Create a new order with the provided details. The order will be processed asynchronously.",
    responses={
        201: {"description": "Order created successfully"},
        400: {"description": "Invalid order data"},
        422: {"description": "Validation error"},
        500: {"description": "Internal server error"}
    }
)
async def create_order(
    request: OrderCreateRequest,
    trace_id: str = None,
    span_id: str = None
) -> OrderResponse:
    """Create a new order"""
    try:
        order_response = await order_controller.create_order_use_case.execute(
            request=request,
            trace_id=trace_id,
            span_id=span_id
        )
        
        return order_response
        
    except InvalidOrderDataError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except InsufficientStockError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error creating order: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get(
    "/customer/{customer_id}",
    response_model=List[OrderResponse],
    summary="List orders by customer",
    description="Retrieve all orders for a specific customer",
    responses={
        200: {"description": "Orders found"},
        422: {"description": "Invalid customer ID"},
        500: {"description": "Internal server error"}
    }
)
async def list_orders_by_customer(
    customer_id: str,
    limit: int = 100,
    offset: int = 0,
    trace_id: str = None,
    span_id: str = None
) -> List[OrderResponse]:
    """List orders by customer ID"""
    try:
        # Validate and convert customer_id to UUID
        try:
            customer_uuid = UUID(customer_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid customer ID format. Expected UUID."
            )
        
        # Validate parameters
        if limit < 1 or limit > 1000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Limit must be between 1 and 1000"
            )
        
        if offset < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Offset must be non-negative"
            )
        
        orders = await order_controller.list_orders_use_case.execute(
            customer_id=customer_uuid,
            limit=limit,
            offset=offset,
            trace_id=trace_id,
            span_id=span_id
        )
        
        return orders
        
    except HTTPException:
        # Re-raise HTTPException to preserve status code and detail
        raise
    except Exception as e:
        logger.error(f"Unexpected error listing orders: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get(
    "/{order_id}",
    response_model=OrderResponse,
    summary="Get order by ID",
    description="Retrieve an order by its unique identifier",
    responses={
        200: {"description": "Order found"},
        404: {"description": "Order not found"},
        422: {"description": "Invalid order ID format"},
        500: {"description": "Internal server error"}
    }
)
async def get_order(
    order_id: UUID,
    trace_id: str = None,
    span_id: str = None
) -> OrderResponse:
    """Get order by ID"""
    try:
        order_response = await order_controller.get_order_use_case.execute(
            order_id=order_id,
            trace_id=trace_id,
            span_id=span_id
        )
        
        return order_response
        
    except OrderNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error getting order: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get(
    "/",
    response_model=List[OrderResponse],
    summary="List recent orders",
    description="Retrieve recent orders (last 100)",
    responses={
        200: {"description": "Orders found"},
        500: {"description": "Internal server error"}
    }
)
async def list_recent_orders(
    limit: int = 100,
    offset: int = 0,
    trace_id: str = None,
    span_id: str = None
) -> List[OrderResponse]:
    """List all orders"""
    try:
        # Validate parameters
        if limit < 1 or limit > 1000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Limit must be between 1 and 1000"
            )
        
        if offset < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Offset must be non-negative"
            )
        
        orders = await order_controller.list_all_orders_use_case.execute(
            limit=limit,
            offset=offset,
            trace_id=trace_id,
            span_id=span_id
        )
        
        return orders
        
    except HTTPException:
        # Re-raise HTTPException to preserve status code and detail
        raise
    except Exception as e:
        logger.error(f"Unexpected error listing all orders: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
