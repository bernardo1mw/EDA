# Tests for Customer API routes
import pytest
from unittest.mock import AsyncMock, patch
from uuid import uuid4
from datetime import datetime

from fastapi.testclient import TestClient

from main import app
from app.core.auth import get_current_user
from app.domain.models.customer import CustomerResponse, CustomerNotFoundError

# Override auth dependency so route tests don't require real JWT tokens
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

    @patch('app.interfaces.api.routes.customers.create_customer_use_case')
    def test_create_customer_success(self, mock_use_case):
        customer_response = make_customer_response()
        mock_use_case.execute = AsyncMock(return_value=customer_response)

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

    def test_create_customer_invalid_data_422(self):
        # email is required and must be valid
        payload = {"name": "Jane Doe", "email": "not-an-email"}
        response = client.post("/customers/", json=payload)
        assert response.status_code == 422

    def test_create_customer_missing_required_fields_422(self):
        # name and email are required
        payload = {"phone": "+1234567890"}
        response = client.post("/customers/", json=payload)
        assert response.status_code == 422


class TestListCustomersRoute:

    @patch('app.interfaces.api.routes.customers.list_customers_use_case')
    def test_list_customers_success(self, mock_use_case):
        customers = [
            make_customer_response("Alice", "alice@example.com"),
            make_customer_response("Bob", "bob@example.com"),
        ]
        mock_use_case.execute = AsyncMock(return_value=customers)

        response = client.get("/customers/")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2


class TestGetCustomerRoute:

    @patch('app.interfaces.api.routes.customers.get_customer_use_case')
    def test_get_customer_success(self, mock_use_case):
        customer_response = make_customer_response()
        mock_use_case.execute = AsyncMock(return_value=customer_response)

        response = client.get(f"/customers/{customer_response.id}")

        assert response.status_code == 200
        data = response.json()
        assert str(data["id"]) == str(customer_response.id)
        assert data["name"] == "Jane Doe"

    @patch('app.interfaces.api.routes.customers.get_customer_use_case')
    def test_get_customer_not_found(self, mock_use_case):
        customer_id = uuid4()
        mock_use_case.execute = AsyncMock(
            side_effect=CustomerNotFoundError(f"Customer with ID {customer_id} not found")
        )

        response = client.get(f"/customers/{customer_id}")

        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()


class TestUpdateCustomerRoute:

    @patch('app.interfaces.api.routes.customers.update_customer_use_case')
    def test_update_customer_success(self, mock_use_case):
        customer_response = make_customer_response(name="Jane Updated")
        mock_use_case.execute = AsyncMock(return_value=customer_response)
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


if __name__ == "__main__":
    pytest.main([__file__])
