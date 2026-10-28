# Tests for Customer API routes
import pytest
from unittest.mock import AsyncMock
from uuid import uuid4
from datetime import datetime

from fastapi.testclient import TestClient

from main import app
from app.core.auth import get_current_user
from app.domain.models.customer import CustomerResponse, CustomerNotFoundError
from app.interfaces.api.routes.customers import (
    get_create_use_case,
    get_get_use_case,
    get_list_use_case,
    get_update_use_case,
)

app.dependency_overrides[get_current_user] = lambda: {"user_id": "test-user", "email": "test@test.com"}

client = TestClient(app)


def make_customer_response(name: str = "Jane Doe", email: str = "jane@example.com") -> CustomerResponse:
    return CustomerResponse(
        id=uuid4(),
        name=name,
        email=email,
        phone="+1234567890",
        address="123 Main St",
        created_at=datetime(2024, 1, 1),
        updated_at=datetime(2024, 1, 1),
    )


class TestCreateCustomerRoute:

    def test_create_customer_success(self):
        customer_response = make_customer_response()
        mock_use_case = AsyncMock()
        mock_use_case.execute = AsyncMock(return_value=customer_response)
        app.dependency_overrides[get_create_use_case] = lambda: mock_use_case

        payload = {
            "name": "Jane Doe",
            "email": "jane@example.com",
            "phone": "+1234567890",
            "address": "123 Main St",
        }
        response = client.post("/customers/", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Jane Doe"
        assert data["email"] == "jane@example.com"

        app.dependency_overrides.pop(get_create_use_case, None)

    def test_create_customer_invalid_data_422(self):
        payload = {"name": "Jane Doe", "email": "not-an-email"}
        response = client.post("/customers/", json=payload)
        assert response.status_code == 422

    def test_create_customer_missing_required_fields_422(self):
        payload = {"phone": "+1234567890"}
        response = client.post("/customers/", json=payload)
        assert response.status_code == 422


class TestListCustomersRoute:

    def test_list_customers_success(self):
        customers = [
            make_customer_response("Alice", "alice@example.com"),
            make_customer_response("Bob", "bob@example.com"),
        ]
        mock_use_case = AsyncMock()
        mock_use_case.execute = AsyncMock(return_value=customers)
        app.dependency_overrides[get_list_use_case] = lambda: mock_use_case

        response = client.get("/customers/")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2

        app.dependency_overrides.pop(get_list_use_case, None)


class TestGetCustomerRoute:

    def test_get_customer_success(self):
        customer_response = make_customer_response()
        mock_use_case = AsyncMock()
        mock_use_case.execute = AsyncMock(return_value=customer_response)
        app.dependency_overrides[get_get_use_case] = lambda: mock_use_case

        response = client.get(f"/customers/{customer_response.id}")

        assert response.status_code == 200
        data = response.json()
        assert str(data["id"]) == str(customer_response.id)
        assert data["name"] == "Jane Doe"

        app.dependency_overrides.pop(get_get_use_case, None)

    def test_get_customer_not_found(self):
        customer_id = uuid4()
        mock_use_case = AsyncMock()
        mock_use_case.execute = AsyncMock(
            side_effect=CustomerNotFoundError(f"Customer with ID {customer_id} not found")
        )
        app.dependency_overrides[get_get_use_case] = lambda: mock_use_case

        response = client.get(f"/customers/{customer_id}")

        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()

        app.dependency_overrides.pop(get_get_use_case, None)


class TestUpdateCustomerRoute:

    def test_update_customer_success(self):
        customer_response = make_customer_response(name="Jane Updated")
        mock_use_case = AsyncMock()
        mock_use_case.execute = AsyncMock(return_value=customer_response)
        app.dependency_overrides[get_update_use_case] = lambda: mock_use_case
        customer_id = uuid4()

        payload = {
            "name": "Jane Updated",
            "email": "jane@example.com",
            "phone": "+9999999999",
            "address": "456 New St",
        }
        response = client.put(f"/customers/{customer_id}", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Jane Updated"

        app.dependency_overrides.pop(get_update_use_case, None)


if __name__ == "__main__":
    pytest.main([__file__])
