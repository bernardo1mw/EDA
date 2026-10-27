# Tests for Customer Use Cases
import pytest
from unittest.mock import AsyncMock
from uuid import uuid4
from datetime import datetime

from app.domain.models.customer import (
    Customer,
    CustomerCreateRequest,
    CustomerUpdateRequest,
    CustomerNotFoundError,
    InvalidCustomerDataError,
    DuplicateEmailError,
)
from app.application.use_cases.customer_use_cases import (
    CreateCustomerUseCase,
    GetCustomerUseCase,
    ListCustomersUseCase,
    UpdateCustomerUseCase,
)


def make_customer(name: str = "Jane Doe", email: str = "jane@example.com") -> Customer:
    return Customer(
        id=uuid4(),
        name=name,
        email=email,
        phone="+1234567890",
        address="123 Main St",
        created_at=datetime(2024, 1, 1),
        updated_at=datetime(2024, 1, 1),
    )


class TestCreateCustomerUseCase:

    @pytest.mark.asyncio
    async def test_create_customer_success(self):
        mock_repository = AsyncMock()
        saved = make_customer()
        mock_repository.get_by_email.return_value = None
        mock_repository.create.return_value = saved

        use_case = CreateCustomerUseCase(mock_repository)
        request = CustomerCreateRequest(name="Jane Doe", email="jane@example.com", phone="+1234567890")
        result = await use_case.execute(request)

        assert result.name == saved.name
        assert result.email == saved.email
        mock_repository.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_customer_duplicate_email_error(self):
        mock_repository = AsyncMock()
        existing = make_customer()
        mock_repository.get_by_email.return_value = existing

        use_case = CreateCustomerUseCase(mock_repository)
        request = CustomerCreateRequest(name="Other Person", email="jane@example.com")

        with pytest.raises(DuplicateEmailError):
            await use_case.execute(request)

        mock_repository.create.assert_not_called()

    @pytest.mark.asyncio
    async def test_create_customer_invalid_name_whitespace(self):
        mock_repository = AsyncMock()
        mock_repository.get_by_email.return_value = None

        use_case = CreateCustomerUseCase(mock_repository)
        # Bypass Pydantic min_length=1 to test use case validation of whitespace-only name
        request = CustomerCreateRequest.model_construct(
            name="  ", email="valid@example.com", phone=None, address=None
        )

        with pytest.raises(InvalidCustomerDataError):
            await use_case.execute(request)

        mock_repository.create.assert_not_called()


class TestGetCustomerUseCase:

    @pytest.mark.asyncio
    async def test_get_customer_success(self):
        mock_repository = AsyncMock()
        customer = make_customer()
        mock_repository.get_by_id.return_value = customer

        use_case = GetCustomerUseCase(mock_repository)
        result = await use_case.execute(customer.id)

        assert result.id == customer.id
        assert result.name == customer.name
        assert result.email == customer.email
        mock_repository.get_by_id.assert_called_once_with(customer.id)

    @pytest.mark.asyncio
    async def test_get_customer_not_found(self):
        mock_repository = AsyncMock()
        mock_repository.get_by_id.return_value = None

        use_case = GetCustomerUseCase(mock_repository)

        with pytest.raises(CustomerNotFoundError):
            await use_case.execute(uuid4())


class TestListCustomersUseCase:

    @pytest.mark.asyncio
    async def test_list_customers_success(self):
        mock_repository = AsyncMock()
        customers = [make_customer("Alice", "alice@example.com"), make_customer("Bob", "bob@example.com")]
        mock_repository.list_all.return_value = customers

        use_case = ListCustomersUseCase(mock_repository)
        result = await use_case.execute(limit=10, offset=0)

        assert len(result) == 2
        assert result[0].name == "Alice"
        assert result[1].name == "Bob"

    @pytest.mark.asyncio
    async def test_list_customers_empty(self):
        mock_repository = AsyncMock()
        mock_repository.list_all.return_value = []

        use_case = ListCustomersUseCase(mock_repository)
        result = await use_case.execute()

        assert result == []


class TestUpdateCustomerUseCase:

    @pytest.mark.asyncio
    async def test_update_customer_success(self):
        mock_repository = AsyncMock()
        existing = make_customer()
        updated = make_customer(name="Jane Updated", email="jane@example.com")
        mock_repository.get_by_id.return_value = existing
        mock_repository.get_by_email.return_value = existing  # same customer, no conflict
        mock_repository.update.return_value = updated

        use_case = UpdateCustomerUseCase(mock_repository)
        request = CustomerUpdateRequest(name="Jane Updated", email="jane@example.com")
        result = await use_case.execute(existing.id, request)

        assert result.name == "Jane Updated"
        mock_repository.update.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_customer_not_found(self):
        mock_repository = AsyncMock()
        mock_repository.get_by_id.return_value = None

        use_case = UpdateCustomerUseCase(mock_repository)
        request = CustomerUpdateRequest(name="Jane", email="jane@example.com")

        with pytest.raises(CustomerNotFoundError):
            await use_case.execute(uuid4(), request)

        mock_repository.update.assert_not_called()


if __name__ == "__main__":
    pytest.main([__file__])
