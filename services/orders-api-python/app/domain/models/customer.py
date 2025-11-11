# Domain Models - Customer
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, validator, EmailStr

class CustomerCreateRequest(BaseModel):
    """Request model for creating a customer"""
    name: str = Field(..., min_length=1, max_length=255, description="Customer name")
    email: EmailStr = Field(..., description="Customer email")
    phone: Optional[str] = Field(None, max_length=50, description="Customer phone")
    address: Optional[str] = Field(None, description="Customer address")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "john.doe@example.com",
                "phone": "+1234567890",
                "address": "123 Main St, City, Country"
            }
        }

class CustomerUpdateRequest(BaseModel):
    """Request model for updating a customer"""
    name: str = Field(..., min_length=1, max_length=255, description="Customer name")
    email: EmailStr = Field(..., description="Customer email")
    phone: Optional[str] = Field(None, max_length=50, description="Customer phone")
    address: Optional[str] = Field(None, description="Customer address")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "john.doe@example.com",
                "phone": "+1234567890",
                "address": "123 Main St, City, Country"
            }
        }

class CustomerResponse(BaseModel):
    """Response model for customer data"""
    id: UUID = Field(..., description="Unique customer identifier")
    name: str = Field(..., description="Customer name")
    email: str = Field(..., description="Customer email")
    phone: Optional[str] = Field(None, description="Customer phone")
    address: Optional[str] = Field(None, description="Customer address")
    created_at: datetime = Field(..., description="Customer creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }

class Customer(BaseModel):
    """Domain model for Customer"""
    id: UUID
    name: str
    email: str
    phone: Optional[str]
    address: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def create_new(
        cls,
        name: str,
        email: str,
        phone: Optional[str] = None,
        address: Optional[str] = None
    ) -> "Customer":
        """Create a new customer"""
        now = datetime.utcnow()
        return cls(
            id=uuid4(),
            name=name,
            email=email,
            phone=phone,
            address=address,
            created_at=now,
            updated_at=now
        )
    
    def update_info(
        self,
        name: Optional[str] = None,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        address: Optional[str] = None
    ) -> None:
        """Update customer information"""
        if name is not None:
            self.name = name
        if email is not None:
            self.email = email
        if phone is not None:
            self.phone = phone
        if address is not None:
            self.address = address
        self.updated_at = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert customer to dictionary"""
        return {
            "id": str(self.id),
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "address": self.address,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }

class CustomerNotFoundError(Exception):
    """Exception raised when customer is not found"""
    pass

class InvalidCustomerDataError(Exception):
    """Exception raised when customer data is invalid"""
    pass

class DuplicateEmailError(Exception):
    """Exception raised when email already exists"""
    pass

