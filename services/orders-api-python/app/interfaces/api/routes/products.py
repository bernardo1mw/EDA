# Interface Layer - API Routes - Products
from fastapi import APIRouter, HTTPException, status
from typing import List
from uuid import UUID
import logging

from app.domain.models.product import (
    ProductCreateRequest,
    ProductUpdateRequest,
    ProductResponse,
    ProductNotFoundError,
    InvalidProductDataError
)
from app.application.use_cases.product_use_cases import (
    CreateProductUseCase,
    GetProductUseCase,
    ListProductsUseCase,
    UpdateProductUseCase
)
from app.infrastructure.database.repositories import ProductRepository

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Create repository and use cases
product_repository = ProductRepository()
create_product_use_case = CreateProductUseCase(product_repository)
get_product_use_case = GetProductUseCase(product_repository)
list_products_use_case = ListProductsUseCase(product_repository)
update_product_use_case = UpdateProductUseCase(product_repository)

@router.post(
    "/",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new product",
    description="Create a new product with the provided details",
    responses={
        201: {"description": "Product created successfully"},
        400: {"description": "Invalid product data"},
        422: {"description": "Validation error"},
        500: {"description": "Internal server error"}
    }
)
async def create_product(request: ProductCreateRequest) -> ProductResponse:
    """Create a new product"""
    try:
        product_response = await create_product_use_case.execute(request)
        return product_response
        
    except InvalidProductDataError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error creating product: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get(
    "/",
    response_model=List[ProductResponse],
    summary="List all products",
    description="Retrieve all products",
    responses={
        200: {"description": "Products found"},
        500: {"description": "Internal server error"}
    }
)
async def list_products(
    limit: int = 100,
    offset: int = 0
) -> List[ProductResponse]:
    """List all products"""
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
        
        products = await list_products_use_case.execute(limit=limit, offset=offset)
        return products
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error listing products: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Get product by ID",
    description="Retrieve a product by its unique identifier",
    responses={
        200: {"description": "Product found"},
        404: {"description": "Product not found"},
        422: {"description": "Invalid product ID format"},
        500: {"description": "Internal server error"}
    }
)
async def get_product(product_id: UUID) -> ProductResponse:
    """Get product by ID"""
    try:
        product_response = await get_product_use_case.execute(product_id)
        return product_response
        
    except ProductNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error getting product: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.put(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Update a product",
    description="Update an existing product with the provided details",
    responses={
        200: {"description": "Product updated successfully"},
        400: {"description": "Invalid product data"},
        404: {"description": "Product not found"},
        422: {"description": "Validation error"},
        500: {"description": "Internal server error"}
    }
)
async def update_product(product_id: UUID, request: ProductUpdateRequest) -> ProductResponse:
    """Update a product"""
    try:
        product_response = await update_product_use_case.execute(product_id, request)
        return product_response
        
    except ProductNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except InvalidProductDataError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error updating product: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

