# Application Use Cases - Customer
from typing import Optional, List
from uuid import UUID
from datetime import datetime
import logging

from app.domain.models.customer import (
    Customer,
    CustomerCreateRequest,
    CustomerUpdateRequest,
    CustomerResponse,
    CustomerNotFoundError,
    InvalidCustomerDataError,
    DuplicateEmailError
)
from app.domain.interfaces.repositories import CustomerRepositoryInterface
from app.core.logging import LoggerMixin

logger = logging.getLogger(__name__)

class CreateCustomerUseCase(LoggerMixin):
    """Use case for creating a new customer"""
    
    def __init__(self, customer_repository: CustomerRepositoryInterface):
        self.customer_repository = customer_repository
    
    async def execute(self, request: CustomerCreateRequest) -> CustomerResponse:
        """Execute customer creation use case"""
        
        try:
            # Validate business rules
            await self._validate_customer_data(request)
            
            # Check if email already exists
            existing = await self.customer_repository.get_by_email(request.email)
            if existing:
                raise DuplicateEmailError(f"Customer with email {request.email} already exists")
            
            # Create domain model
            customer = Customer.create_new(
                name=request.name,
                email=request.email,
                phone=request.phone,
                address=request.address
            )
            
            # Save customer
            saved_customer = await self.customer_repository.create(customer)
            
            # Create response
            response = CustomerResponse(
                id=saved_customer.id,
                name=saved_customer.name,
                email=saved_customer.email,
                phone=saved_customer.phone,
                address=saved_customer.address,
                created_at=saved_customer.created_at,
                updated_at=saved_customer.updated_at
            )
            return response
            
        except (InvalidCustomerDataError, DuplicateEmailError):
            raise
        except Exception as e:
            self.log_error("Failed to create customer", error=str(e), email=request.email)
            raise
    
    async def _validate_customer_data(self, request: CustomerCreateRequest) -> None:
        """Validate customer data against business rules"""
        
        if not request.name or not request.name.strip():
            raise InvalidCustomerDataError("Customer name is required")
        
        if not request.email or not request.email.strip():
            raise InvalidCustomerDataError("Customer email is required")

class GetCustomerUseCase(LoggerMixin):
    """Use case for getting a customer by ID"""
    
    def __init__(self, customer_repository: CustomerRepositoryInterface):
        self.customer_repository = customer_repository
    
    async def execute(self, customer_id: UUID) -> CustomerResponse:
        """Execute get customer use case"""
        
        try:
            customer = await self.customer_repository.get_by_id(customer_id)
            
            if not customer:
                self.log_warning("Customer not found", customer_id=str(customer_id))
                raise CustomerNotFoundError(f"Customer with ID {customer_id} not found")
            
            return CustomerResponse(
                id=customer.id,
                name=customer.name,
                email=customer.email,
                phone=customer.phone,
                address=customer.address,
                created_at=customer.created_at,
                updated_at=customer.updated_at
            )
            
        except CustomerNotFoundError:
            raise
        except Exception as e:
            self.log_error("Failed to get customer", error=str(e), customer_id=str(customer_id))
            raise

class ListCustomersUseCase(LoggerMixin):
    """Use case for listing all customers"""
    
    def __init__(self, customer_repository: CustomerRepositoryInterface):
        self.customer_repository = customer_repository
    
    async def execute(self, limit: int = 100, offset: int = 0) -> List[CustomerResponse]:
        """Execute list customers use case"""
        
        try:
            customers = await self.customer_repository.list_all(limit=limit, offset=offset)
            
            return [
                CustomerResponse(
                    id=c.id,
                    name=c.name,
                    email=c.email,
                    phone=c.phone,
                    address=c.address,
                    created_at=c.created_at,
                    updated_at=c.updated_at
                )
                for c in customers
            ]
            
        except Exception as e:
            self.log_error("Failed to list customers", error=str(e))
            raise

class UpdateCustomerUseCase(LoggerMixin):
    """Use case for updating a customer"""
    
    def __init__(self, customer_repository: CustomerRepositoryInterface):
        self.customer_repository = customer_repository
    
    async def execute(self, customer_id: UUID, request: CustomerUpdateRequest) -> CustomerResponse:
        """Execute customer update use case"""
        
        try:
            # Get existing customer
            existing_customer = await self.customer_repository.get_by_id(customer_id)
            if not existing_customer:
                raise CustomerNotFoundError(f"Customer with ID {customer_id} not found")
            
            # Validate business rules
            await self._validate_customer_update_data(request)
            
            # Check if email already exists (excluding current customer)
            existing = await self.customer_repository.get_by_email(request.email)
            if existing and existing.id != customer_id:
                raise DuplicateEmailError(f"Customer with email {request.email} already exists")
            
            # Update domain model
            existing_customer.name = request.name
            existing_customer.email = request.email
            existing_customer.phone = request.phone
            existing_customer.address = request.address
            existing_customer.updated_at = datetime.utcnow()
            
            # Save updated customer
            updated_customer = await self.customer_repository.update(existing_customer)
            
            # Create response
            response = CustomerResponse(
                id=updated_customer.id,
                name=updated_customer.name,
                email=updated_customer.email,
                phone=updated_customer.phone,
                address=updated_customer.address,
                created_at=updated_customer.created_at,
                updated_at=updated_customer.updated_at
            )
            return response
            
        except (CustomerNotFoundError, InvalidCustomerDataError, DuplicateEmailError):
            raise
        except Exception as e:
            self.log_error("Failed to update customer", error=str(e), customer_id=str(customer_id))
            raise
    
    async def _validate_customer_update_data(self, request: CustomerUpdateRequest) -> None:
        """Validate customer update data against business rules"""
        
        if not request.name or not request.name.strip():
            raise InvalidCustomerDataError("Customer name is required")
        
        if not request.email or not request.email.strip():
            raise InvalidCustomerDataError("Customer email is required")

