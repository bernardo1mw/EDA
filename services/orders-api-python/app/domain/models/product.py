# Domain Models - Product
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, validator

class ProductCreateRequest(BaseModel):
    """Request model for creating a product"""
    name: str = Field(..., min_length=1, max_length=255, description="Product name")
    description: Optional[str] = Field(None, description="Product description")
    price: float = Field(..., gt=0, description="Product price")
    sku: Optional[str] = Field(None, max_length=100, description="Product SKU")
    stock_quantity: int = Field(0, ge=0, description="Initial stock quantity")
    
    @validator('price')
    def validate_price(cls, v):
        """Validate price precision"""
        if round(v, 2) != v:
            raise ValueError('Price must have at most 2 decimal places')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Product Name",
                "description": "Product description",
                "price": 99.99,
                "sku": "PROD-001",
                "stock_quantity": 100
            }
        }

class ProductUpdateRequest(BaseModel):
    """Request model for updating a product"""
    name: str = Field(..., min_length=1, max_length=255, description="Product name")
    description: Optional[str] = Field(None, description="Product description")
    price: float = Field(..., gt=0, description="Product price")
    sku: Optional[str] = Field(None, max_length=100, description="Product SKU")
    stock_quantity: int = Field(..., ge=0, description="Stock quantity")
    
    @validator('price')
    def validate_price(cls, v):
        """Validate price precision"""
        if round(v, 2) != v:
            raise ValueError('Price must have at most 2 decimal places')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Product Name",
                "description": "Product description",
                "price": 99.99,
                "sku": "PROD-001",
                "stock_quantity": 100
            }
        }

class ProductResponse(BaseModel):
    """Response model for product data"""
    id: UUID = Field(..., description="Unique product identifier")
    name: str = Field(..., description="Product name")
    description: Optional[str] = Field(None, description="Product description")
    price: float = Field(..., description="Product price")
    sku: Optional[str] = Field(None, description="Product SKU")
    stock_quantity: int = Field(..., description="Stock quantity")
    created_at: datetime = Field(..., description="Product creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }

class Product(BaseModel):
    """Domain model for Product"""
    id: UUID
    name: str
    description: Optional[str]
    price: float
    sku: Optional[str]
    stock_quantity: int
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def create_new(
        cls,
        name: str,
        price: float,
        description: Optional[str] = None,
        sku: Optional[str] = None,
        stock_quantity: int = 0
    ) -> "Product":
        """Create a new product"""
        now = datetime.utcnow()
        return cls(
            id=uuid4(),
            name=name,
            description=description,
            price=price,
            sku=sku,
            stock_quantity=stock_quantity,
            created_at=now,
            updated_at=now
        )
    
    def update_stock(self, quantity: int) -> None:
        """Update stock quantity"""
        if self.stock_quantity + quantity < 0:
            raise ValueError("Insufficient stock")
        self.stock_quantity += quantity
        self.updated_at = datetime.utcnow()
    
    def reserve_stock(self, quantity: int) -> bool:
        """Reserve stock (decrease available stock)"""
        if self.stock_quantity < quantity:
            return False
        self.update_stock(-quantity)
        return True
    
    def release_stock(self, quantity: int) -> None:
        """Release reserved stock (increase available stock)"""
        self.update_stock(quantity)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert product to dictionary"""
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "sku": self.sku,
            "stock_quantity": self.stock_quantity,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }

class ProductNotFoundError(Exception):
    """Exception raised when product is not found"""
    pass

class InvalidProductDataError(Exception):
    """Exception raised when product data is invalid"""
    pass

class InsufficientStockError(Exception):
    """Exception raised when there is insufficient stock"""
    pass

