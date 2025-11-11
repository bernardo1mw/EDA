# Tests for Orders API
import pytest
import pytest_asyncio
from httpx import AsyncClient
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from main import app
from app.domain.models.order import OrderCreateRequest, OrderResponse, OrderStatus
from app.application.use_cases.order_use_cases import CreateOrderUseCase, GetOrderUseCase

# Test client
client = TestClient(app)

class TestOrderAPI:
    """Test cases for Order API endpoints"""
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["healthy", "unhealthy"]
        assert "timestamp" in data
        assert "service" in data
    
    def test_readiness_check(self):
        """Test readiness check endpoint"""
        response = client.get("/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
    
    def test_liveness_check(self):
        """Test liveness check endpoint"""
        response = client.get("/health/live")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "alive"
    
    @patch('app.interfaces.api.routes.orders.order_controller')
    def test_create_order_success(self, mock_controller):
        """Test successful order creation"""
        # Mock the use case
        mock_order_response = OrderResponse(
            id=uuid4(),
            customer_id="customer-001",
            product_id="product-001",
            quantity=2,
            total_amount=99.98,
            status=OrderStatus.PENDING,
            created_at="2024-01-01T00:00:00Z",
            updated_at="2024-01-01T00:00:00Z"
        )
        
        mock_controller.create_order_use_case.execute = AsyncMock(return_value=mock_order_response)
        
        # Test data
        order_data = {
            "customer_id": "customer-001",
            "product_id": "product-001",
            "quantity": 2,
            "total_amount": 99.98
        }
        
        response = client.post("/orders/", json=order_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["customer_id"] == "customer-001"
        assert data["product_id"] == "product-001"
        assert data["quantity"] == 2
        assert data["total_amount"] == 99.98
        assert data["status"] == "PENDING"
    
    def test_create_order_invalid_data(self):
        """Test order creation with invalid data"""
        # Test with negative quantity
        order_data = {
            "customer_id": "customer-001",
            "product_id": "product-001",
            "quantity": -1,
            "total_amount": 99.98
        }
        
        response = client.post("/orders/", json=order_data)
        assert response.status_code == 422
    
    def test_create_order_missing_fields(self):
        """Test order creation with missing required fields"""
        order_data = {
            "customer_id": "customer-001",
            "product_id": "product-001"
            # Missing quantity and total_amount
        }
        
        response = client.post("/orders/", json=order_data)
        assert response.status_code == 422
    
    @patch('app.interfaces.api.routes.orders.order_controller')
    def test_get_order_success(self, mock_controller):
        """Test successful order retrieval"""
        order_id = uuid4()
        mock_order_response = OrderResponse(
            id=order_id,
            customer_id="customer-001",
            product_id="product-001",
            quantity=2,
            total_amount=99.98,
            status=OrderStatus.PENDING,
            created_at="2024-01-01T00:00:00Z",
            updated_at="2024-01-01T00:00:00Z"
        )
        
        mock_controller.get_order_use_case.execute = AsyncMock(return_value=mock_order_response)
        
        response = client.get(f"/orders/{order_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert str(data["id"]) == str(order_id)
        assert data["customer_id"] == "customer-001"
    
    @patch('app.interfaces.api.routes.orders.order_controller')
    def test_get_order_not_found(self, mock_controller):
        """Test order retrieval when order not found"""
        from app.domain.models.order import OrderNotFoundError
        
        order_id = uuid4()
        mock_controller.get_order_use_case.execute = AsyncMock(
            side_effect=OrderNotFoundError(f"Order with ID {order_id} not found")
        )
        
        response = client.get(f"/orders/{order_id}")
        assert response.status_code == 404
        
        data = response.json()
        assert "not found" in data["detail"].lower()
    
    def test_get_order_invalid_uuid(self):
        """Test order retrieval with invalid UUID"""
        response = client.get("/orders/invalid-uuid")
        assert response.status_code == 422
    
    @patch('app.interfaces.api.routes.orders.order_controller')
    def test_list_orders_by_customer(self, mock_controller):
        """Test listing orders by customer"""
        mock_orders = [
            OrderResponse(
                id=uuid4(),
                customer_id="customer-001",
                product_id="product-001",
                quantity=1,
                total_amount=49.99,
                status=OrderStatus.COMPLETED,
                created_at="2024-01-01T00:00:00Z",
                updated_at="2024-01-01T00:00:00Z"
            )
        ]
        
        mock_controller.list_orders_use_case.execute = AsyncMock(return_value=mock_orders)
        
        response = client.get("/orders/customer/customer-001")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["customer_id"] == "customer-001"
    
    def test_list_orders_invalid_limit(self):
        """Test listing orders with invalid limit"""
        response = client.get("/orders/customer/customer-001?limit=0")
        assert response.status_code == 400
        
        response = client.get("/orders/customer/customer-001?limit=2000")
        assert response.status_code == 400
    
    def test_list_orders_invalid_offset(self):
        """Test listing orders with invalid offset"""
        response = client.get("/orders/customer/customer-001?offset=-1")
        assert response.status_code == 400

class TestOrderUseCases:
    """Test cases for Order Use Cases"""
    
    @pytest.mark.asyncio
    async def test_create_order_use_case_success(self):
        """Test successful order creation use case"""
        # Mock dependencies
        mock_repository = AsyncMock()
        mock_event_publisher = AsyncMock()
        
        # Mock repository response
        mock_order = OrderResponse(
            id=uuid4(),
            customer_id="customer-001",
            product_id="product-001",
            quantity=2,
            total_amount=99.98,
            status=OrderStatus.PENDING,
            created_at="2024-01-01T00:00:00Z",
            updated_at="2024-01-01T00:00:00Z"
        )
        
        mock_repository.create.return_value = mock_order
        mock_event_publisher.publish_order_created.return_value = True
        
        # Create use case
        use_case = CreateOrderUseCase(mock_repository, mock_event_publisher)
        
        # Test data
        request = OrderCreateRequest(
            customer_id="customer-001",
            product_id="product-001",
            quantity=2,
            total_amount=99.98
        )
        
        # Execute use case
        result = await use_case.execute(request)
        
        # Assertions
        assert result.customer_id == "customer-001"
        assert result.product_id == "product-001"
        assert result.quantity == 2
        assert result.total_amount == 99.98
        assert result.status == OrderStatus.PENDING
        
        # Verify repository was called
        mock_repository.create.assert_called_once()
        mock_event_publisher.publish_order_created.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_order_use_case_invalid_data(self):
        """Test order creation with invalid data"""
        from app.domain.models.order import InvalidOrderDataError
        
        # Mock dependencies
        mock_repository = AsyncMock()
        mock_event_publisher = AsyncMock()
        
        # Create use case
        use_case = CreateOrderUseCase(mock_repository, mock_event_publisher)
        
        # Test data with invalid quantity
        request = OrderCreateRequest(
            customer_id="customer-001",
            product_id="product-001",
            quantity=0,  # Invalid quantity
            total_amount=99.98
        )
        
        # Execute use case and expect exception
        with pytest.raises(InvalidOrderDataError):
            await use_case.execute(request)
        
        # Verify repository was not called
        mock_repository.create.assert_not_called()
        mock_event_publisher.publish_order_created.assert_not_called()

if __name__ == "__main__":
    pytest.main([__file__])
