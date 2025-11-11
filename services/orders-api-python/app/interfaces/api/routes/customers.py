# Interface Layer - API Routes - Customers
from fastapi import APIRouter, HTTPException, status
from typing import List
from uuid import UUID
import logging

from app.domain.models.customer import (
    CustomerCreateRequest,
    CustomerUpdateRequest,
    CustomerResponse,
    CustomerNotFoundError,
    InvalidCustomerDataError,
    DuplicateEmailError
)
from app.application.use_cases.customer_use_cases import (
    CreateCustomerUseCase,
    GetCustomerUseCase,
    ListCustomersUseCase,
    UpdateCustomerUseCase
)
from app.infrastructure.database.repositories import CustomerRepository

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Create repository and use cases
customer_repository = CustomerRepository()
create_customer_use_case = CreateCustomerUseCase(customer_repository)
get_customer_use_case = GetCustomerUseCase(customer_repository)
list_customers_use_case = ListCustomersUseCase(customer_repository)
update_customer_use_case = UpdateCustomerUseCase(customer_repository)

@router.post(
    "/",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new customer",
    description="Create a new customer with the provided details",
    responses={
        201: {"description": "Customer created successfully"},
        400: {"description": "Invalid customer data"},
        409: {"description": "Customer with email already exists"},
        422: {"description": "Validation error"},
        500: {"description": "Internal server error"}
    }
)
async def create_customer(request: CustomerCreateRequest) -> CustomerResponse:
    """Create a new customer"""
    try:
        customer_response = await create_customer_use_case.execute(request)
        return customer_response
        
    except InvalidCustomerDataError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except DuplicateEmailError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error creating customer: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get(
    "/",
    response_model=List[CustomerResponse],
    summary="List all customers",
    description="Retrieve all customers",
    responses={
        200: {"description": "Customers found"},
        500: {"description": "Internal server error"}
    }
)
async def list_customers(
    limit: int = 100,
    offset: int = 0
) -> List[CustomerResponse]:
    """List all customers"""
    try:
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
        
        customers = await list_customers_use_case.execute(limit=limit, offset=offset)
        return customers
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error listing customers: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get(
    "/{customer_id}",
    response_model=CustomerResponse,
    summary="Get customer by ID",
    description="Retrieve a customer by its unique identifier",
    responses={
        200: {"description": "Customer found"},
        404: {"description": "Customer not found"},
        422: {"description": "Invalid customer ID format"},
        500: {"description": "Internal server error"}
    }
)
async def get_customer(customer_id: UUID) -> CustomerResponse:
    """Get customer by ID"""
    try:
        customer_response = await get_customer_use_case.execute(customer_id)
        return customer_response
        
    except CustomerNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error getting customer: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.put(
    "/{customer_id}",
    response_model=CustomerResponse,
    summary="Update a customer",
    description="Update an existing customer with the provided details",
    responses={
        200: {"description": "Customer updated successfully"},
        400: {"description": "Invalid customer data"},
        404: {"description": "Customer not found"},
        409: {"description": "Customer with email already exists"},
        422: {"description": "Validation error"},
        500: {"description": "Internal server error"}
    }
)
async def update_customer(customer_id: UUID, request: CustomerUpdateRequest) -> CustomerResponse:
    """Update a customer"""
    try:
        customer_response = await update_customer_use_case.execute(customer_id, request)
        return customer_response
        
    except CustomerNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except InvalidCustomerDataError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except DuplicateEmailError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error updating customer: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

