# Tests for Product API routes
import pytest
from unittest.mock import AsyncMock, patch
from uuid import uuid4
from datetime import datetime

from fastapi.testclient import TestClient

from main import app
from app.core.auth import get_current_user
from app.domain.models.product import ProductResponse, ProductNotFoundError

# Override auth dependency so route tests don't require real JWT tokens
app.dependency_overrides[get_current_user] = lambda: {"user_id": "test-user", "email": "test@test.com"}

client = TestClient(app)


def make_product_response(name: str = "Test Product") -> ProductResponse:
    return ProductResponse(
        id=uuid4(),
        name=name,
        description="Test description",
        price=9.99,
        sku="SKU-001",
        stock_quantity=10,
        created_at=datetime(2024, 1, 1),
        updated_at=datetime(2024, 1, 1),
    )


class TestCreateProductRoute:

    @patch('app.interfaces.api.routes.products.create_product_use_case')
    def test_create_product_success(self, mock_use_case):
        product_response = make_product_response()
        mock_use_case.execute = AsyncMock(return_value=product_response)

        payload = {
            "name": "Test Product",
            "description": "Test description",
            "price": 9.99,
            "sku": "SKU-001",
            "stock_quantity": 10,
        }
        response = client.post("/products/", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Product"
        assert data["price"] == 9.99
        assert data["sku"] == "SKU-001"

    def test_create_product_invalid_data_422(self):
        # price is required and must be > 0
        payload = {"name": "Test Product", "price": -1.00}
        response = client.post("/products/", json=payload)
        assert response.status_code == 422

    def test_create_product_missing_required_fields_422(self):
        # name and price are required
        payload = {"description": "No name or price"}
        response = client.post("/products/", json=payload)
        assert response.status_code == 422


class TestListProductsRoute:

    @patch('app.interfaces.api.routes.products.list_products_use_case')
    def test_list_products_success(self, mock_use_case):
        products = [make_product_response("Product A"), make_product_response("Product B")]
        mock_use_case.execute = AsyncMock(return_value=products)

        response = client.get("/products/")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2


class TestGetProductRoute:

    @patch('app.interfaces.api.routes.products.get_product_use_case')
    def test_get_product_success(self, mock_use_case):
        product_response = make_product_response()
        mock_use_case.execute = AsyncMock(return_value=product_response)

        response = client.get(f"/products/{product_response.id}")

        assert response.status_code == 200
        data = response.json()
        assert str(data["id"]) == str(product_response.id)
        assert data["name"] == "Test Product"

    @patch('app.interfaces.api.routes.products.get_product_use_case')
    def test_get_product_not_found(self, mock_use_case):
        product_id = uuid4()
        mock_use_case.execute = AsyncMock(
            side_effect=ProductNotFoundError(f"Product with ID {product_id} not found")
        )

        response = client.get(f"/products/{product_id}")

        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()


class TestUpdateProductRoute:

    @patch('app.interfaces.api.routes.products.update_product_use_case')
    def test_update_product_success(self, mock_use_case):
        product_response = make_product_response(name="Updated Product")
        mock_use_case.execute = AsyncMock(return_value=product_response)
        product_id = uuid4()

        payload = {
            "name": "Updated Product",
            "description": "Updated description",
            "price": 19.99,
            "sku": "SKU-002",
            "stock_quantity": 5,
        }
        response = client.put(f"/products/{product_id}", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Product"


if __name__ == "__main__":
    pytest.main([__file__])
