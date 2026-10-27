# Tests for Product Use Cases
import pytest
from unittest.mock import AsyncMock
from uuid import uuid4
from datetime import datetime

from app.domain.models.product import (
    Product,
    ProductCreateRequest,
    ProductUpdateRequest,
    ProductNotFoundError,
    InvalidProductDataError,
)
from app.application.use_cases.product_use_cases import (
    CreateProductUseCase,
    GetProductUseCase,
    ListProductsUseCase,
    UpdateProductUseCase,
)


def make_product(name: str = "Test Product", price: float = 9.99, sku: str = "SKU-001") -> Product:
    return Product(
        id=uuid4(),
        name=name,
        description="Test description",
        price=price,
        sku=sku,
        stock_quantity=10,
        created_at=datetime(2024, 1, 1),
        updated_at=datetime(2024, 1, 1),
    )


class TestCreateProductUseCase:

    @pytest.mark.asyncio
    async def test_create_product_success(self):
        mock_repository = AsyncMock()
        saved = make_product()
        mock_repository.get_by_sku.return_value = None
        mock_repository.create.return_value = saved

        use_case = CreateProductUseCase(mock_repository)
        request = ProductCreateRequest(name="Test Product", price=9.99, sku="SKU-001", stock_quantity=10)
        result = await use_case.execute(request)

        assert result.name == saved.name
        assert result.price == saved.price
        assert result.sku == saved.sku
        mock_repository.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_product_duplicate_sku_error(self):
        mock_repository = AsyncMock()
        existing = make_product()
        mock_repository.get_by_sku.return_value = existing

        use_case = CreateProductUseCase(mock_repository)
        request = ProductCreateRequest(name="Another Product", price=5.00, sku="SKU-001", stock_quantity=0)

        with pytest.raises(InvalidProductDataError):
            await use_case.execute(request)

        mock_repository.create.assert_not_called()

    @pytest.mark.asyncio
    async def test_create_product_invalid_name_whitespace(self):
        mock_repository = AsyncMock()
        mock_repository.get_by_sku.return_value = None

        use_case = CreateProductUseCase(mock_repository)
        # Bypass Pydantic min_length=1 to test use case validation of whitespace-only name
        request = ProductCreateRequest.model_construct(
            name="  ", price=9.99, stock_quantity=0, sku=None, description=None
        )

        with pytest.raises(InvalidProductDataError):
            await use_case.execute(request)

        mock_repository.create.assert_not_called()


class TestGetProductUseCase:

    @pytest.mark.asyncio
    async def test_get_product_success(self):
        mock_repository = AsyncMock()
        product = make_product()
        mock_repository.get_by_id.return_value = product

        use_case = GetProductUseCase(mock_repository)
        result = await use_case.execute(product.id)

        assert result.id == product.id
        assert result.name == product.name
        mock_repository.get_by_id.assert_called_once_with(product.id)

    @pytest.mark.asyncio
    async def test_get_product_not_found(self):
        mock_repository = AsyncMock()
        mock_repository.get_by_id.return_value = None

        use_case = GetProductUseCase(mock_repository)
        product_id = uuid4()

        with pytest.raises(ProductNotFoundError):
            await use_case.execute(product_id)


class TestListProductsUseCase:

    @pytest.mark.asyncio
    async def test_list_products_success(self):
        mock_repository = AsyncMock()
        products = [make_product("Product A"), make_product("Product B")]
        mock_repository.list_all.return_value = products

        use_case = ListProductsUseCase(mock_repository)
        result = await use_case.execute(limit=10, offset=0)

        assert len(result) == 2
        assert result[0].name == "Product A"
        assert result[1].name == "Product B"
        mock_repository.list_all.assert_called_once_with(limit=10, offset=0)

    @pytest.mark.asyncio
    async def test_list_products_empty(self):
        mock_repository = AsyncMock()
        mock_repository.list_all.return_value = []

        use_case = ListProductsUseCase(mock_repository)
        result = await use_case.execute()

        assert result == []


class TestUpdateProductUseCase:

    @pytest.mark.asyncio
    async def test_update_product_success(self):
        mock_repository = AsyncMock()
        existing = make_product()
        updated = make_product(name="Updated Product")
        mock_repository.get_by_id.return_value = existing
        mock_repository.get_by_sku.return_value = None
        mock_repository.update.return_value = updated

        use_case = UpdateProductUseCase(mock_repository)
        request = ProductUpdateRequest(
            name="Updated Product", price=19.99, sku="SKU-002", stock_quantity=5
        )
        result = await use_case.execute(existing.id, request)

        assert result.name == "Updated Product"
        mock_repository.update.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_product_not_found(self):
        mock_repository = AsyncMock()
        mock_repository.get_by_id.return_value = None

        use_case = UpdateProductUseCase(mock_repository)
        request = ProductUpdateRequest(name="Updated", price=9.99, sku="SKU-001", stock_quantity=0)

        with pytest.raises(ProductNotFoundError):
            await use_case.execute(uuid4(), request)

        mock_repository.update.assert_not_called()


if __name__ == "__main__":
    pytest.main([__file__])
