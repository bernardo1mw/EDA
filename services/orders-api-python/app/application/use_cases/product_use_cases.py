# Application Use Cases - Product
from typing import Optional, List
from uuid import UUID
from datetime import datetime
import logging

from app.domain.models.product import (
    Product,
    ProductCreateRequest,
    ProductUpdateRequest,
    ProductResponse,
    ProductNotFoundError,
    InvalidProductDataError
)
from app.domain.interfaces.repositories import ProductRepositoryInterface
from app.core.logging import LoggerMixin

logger = logging.getLogger(__name__)

class CreateProductUseCase(LoggerMixin):
    """Use case for creating a new product"""
    
    def __init__(self, product_repository: ProductRepositoryInterface):
        self.product_repository = product_repository
    
    async def execute(self, request: ProductCreateRequest) -> ProductResponse:
        """Execute product creation use case"""
        
        try:
            # Validate business rules
            await self._validate_product_data(request)
            
            # Check if SKU already exists
            if request.sku:
                existing = await self.product_repository.get_by_sku(request.sku)
                if existing:
                    raise InvalidProductDataError(f"Product with SKU {request.sku} already exists")
            
            # Create domain model
            product = Product.create_new(
                name=request.name,
                price=request.price,
                description=request.description,
                sku=request.sku,
                stock_quantity=request.stock_quantity
            )
            
            # Save product
            saved_product = await self.product_repository.create(product)
            
            # Create response
            response = ProductResponse(
                id=saved_product.id,
                name=saved_product.name,
                description=saved_product.description,
                price=saved_product.price,
                sku=saved_product.sku,
                stock_quantity=saved_product.stock_quantity,
                created_at=saved_product.created_at,
                updated_at=saved_product.updated_at
            )
            return response
            
        except InvalidProductDataError:
            raise
        except Exception as e:
            self.log_error("Failed to create product", error=str(e), name=request.name)
            raise
    
    async def _validate_product_data(self, request: ProductCreateRequest) -> None:
        """Validate product data against business rules"""
        
        if not request.name or not request.name.strip():
            raise InvalidProductDataError("Product name is required")
        
        if request.price <= 0:
            raise InvalidProductDataError("Product price must be greater than 0")
        
        if request.stock_quantity < 0:
            raise InvalidProductDataError("Stock quantity cannot be negative")

class GetProductUseCase(LoggerMixin):
    """Use case for getting a product by ID"""
    
    def __init__(self, product_repository: ProductRepositoryInterface):
        self.product_repository = product_repository
    
    async def execute(self, product_id: UUID) -> ProductResponse:
        """Execute get product use case"""
        
        try:
            product = await self.product_repository.get_by_id(product_id)
            
            if not product:
                self.log_warning("Product not found", product_id=str(product_id))
                raise ProductNotFoundError(f"Product with ID {product_id} not found")
            
            return ProductResponse(
                id=product.id,
                name=product.name,
                description=product.description,
                price=product.price,
                sku=product.sku,
                stock_quantity=product.stock_quantity,
                created_at=product.created_at,
                updated_at=product.updated_at
            )
            
        except ProductNotFoundError:
            raise
        except Exception as e:
            self.log_error("Failed to get product", error=str(e), product_id=str(product_id))
            raise

class ListProductsUseCase(LoggerMixin):
    """Use case for listing all products"""
    
    def __init__(self, product_repository: ProductRepositoryInterface):
        self.product_repository = product_repository
    
    async def execute(self, limit: int = 100, offset: int = 0) -> List[ProductResponse]:
        """Execute list products use case"""
        
        try:
            products = await self.product_repository.list_all(limit=limit, offset=offset)
            
            return [
                ProductResponse(
                    id=p.id,
                    name=p.name,
                    description=p.description,
                    price=p.price,
                    sku=p.sku,
                    stock_quantity=p.stock_quantity,
                    created_at=p.created_at,
                    updated_at=p.updated_at
                )
                for p in products
            ]
            
        except Exception as e:
            self.log_error("Failed to list products", error=str(e))
            raise

class UpdateProductUseCase(LoggerMixin):
    """Use case for updating a product"""
    
    def __init__(self, product_repository: ProductRepositoryInterface):
        self.product_repository = product_repository
    
    async def execute(self, product_id: UUID, request: ProductUpdateRequest) -> ProductResponse:
        """Execute product update use case"""
        
        try:
            # Get existing product
            existing_product = await self.product_repository.get_by_id(product_id)
            if not existing_product:
                raise ProductNotFoundError(f"Product with ID {product_id} not found")
            
            # Validate business rules
            await self._validate_product_update_data(request, product_id)
            
            # Check if SKU already exists (excluding current product)
            if request.sku:
                existing = await self.product_repository.get_by_sku(request.sku)
                if existing and existing.id != product_id:
                    raise InvalidProductDataError(f"Product with SKU {request.sku} already exists")
            
            # Update domain model
            existing_product.name = request.name
            existing_product.description = request.description
            existing_product.price = request.price
            existing_product.sku = request.sku
            existing_product.stock_quantity = request.stock_quantity
            existing_product.updated_at = datetime.utcnow()
            
            # Save updated product
            updated_product = await self.product_repository.update(existing_product)
            
            # Create response
            response = ProductResponse(
                id=updated_product.id,
                name=updated_product.name,
                description=updated_product.description,
                price=updated_product.price,
                sku=updated_product.sku,
                stock_quantity=updated_product.stock_quantity,
                created_at=updated_product.created_at,
                updated_at=updated_product.updated_at
            )
            return response
            
        except (ProductNotFoundError, InvalidProductDataError):
            raise
        except Exception as e:
            self.log_error("Failed to update product", error=str(e), product_id=str(product_id))
            raise
    
    async def _validate_product_update_data(self, request: ProductUpdateRequest, product_id: UUID) -> None:
        """Validate product update data against business rules"""
        
        if not request.name or not request.name.strip():
            raise InvalidProductDataError("Product name is required")
        
        if request.price <= 0:
            raise InvalidProductDataError("Product price must be greater than 0")
        
        if request.stock_quantity < 0:
            raise InvalidProductDataError("Stock quantity cannot be negative")

