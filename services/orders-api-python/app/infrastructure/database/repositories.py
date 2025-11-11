# Infrastructure Layer - Database Repositories
from typing import List, Optional
from uuid import UUID
import asyncpg
import orjson
import logging

from app.domain.models.order import Order, OutboxEvent, OrderStatus
from app.domain.models.product import Product
from app.domain.models.customer import Customer
from app.domain.interfaces.repositories import (
    OrderRepositoryInterface,
    OutboxEventRepositoryInterface,
    ProductRepositoryInterface,
    CustomerRepositoryInterface
)
from app.core.database import db_manager
from app.core.logging import LoggerMixin
from app.core.profiling import profiler

logger = logging.getLogger(__name__)

class OrderRepository(OrderRepositoryInterface, LoggerMixin):
    """PostgreSQL implementation of Order repository"""
    
    async def create(self, order: Order) -> Order:
        """Create a new order"""
        query = """
            INSERT INTO orders (id, customer_id, product_id, quantity, total_amount, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, customer_id, product_id, quantity, total_amount, status, created_at, updated_at
        """
        
        try:
            async with db_manager.get_connection() as conn:
                row = await conn.fetchrow(
                    query,
                    order.id,
                    order.customer_id,
                    order.product_id,
                    order.quantity,
                    order.total_amount,
                    order.status.value,
                    order.created_at,
                    order.updated_at
                )
                
                return self._row_to_order(row)
                
        except asyncpg.exceptions.IntegrityConstraintViolationError as e:
            self.log_error("Order creation failed - integrity error", error=str(e))
            raise
        except Exception as e:
            self.log_error("Order creation failed", error=str(e))
            raise
    
    async def get_by_id(self, order_id: UUID) -> Optional[Order]:
        """Get order by ID - Otimizado para performance"""
        # Query otimizada: usa índice primário (id) que já existe
        # PostgreSQL automaticamente usa o índice UUID para busca rápida
        query = """
            SELECT id, customer_id, product_id, quantity, total_amount, status, created_at, updated_at
            FROM orders
            WHERE id = $1
        """
        
        try:
            async with db_manager.get_connection() as conn:
                # Usar prepared statement para melhor performance em queries repetidas
                row = await conn.fetchrow(query, order_id)
                
                if row:
                    return self._row_to_order(row)
                return None
                
        except Exception as e:
            self.log_error("Failed to get order by ID", error=str(e), order_id=str(order_id))
            raise
    
    async def update(self, order: Order) -> Order:
        """Update an existing order"""
        query = """
            UPDATE orders
            SET customer_id = $2, product_id = $3, quantity = $4, total_amount = $5, 
                status = $6, updated_at = $7
            WHERE id = $1
            RETURNING id, customer_id, product_id, quantity, total_amount, status, created_at, updated_at
        """
        
        try:
            async with db_manager.get_connection() as conn:
                row = await conn.fetchrow(
                    query,
                    order.id,
                    order.customer_id,
                    order.product_id,
                    order.quantity,
                    order.total_amount,
                    order.status.value,
                    order.updated_at
                )
                
                return self._row_to_order(row)
                
        except Exception as e:
            self.log_error("Failed to update order", error=str(e), order_id=str(order.id))
            raise
    
    async def update_status(self, order_id: UUID, new_status: OrderStatus) -> bool:
        """Update order status only"""
        query = """
            UPDATE orders
            SET status = $2, updated_at = NOW()
            WHERE id = $1
        """
        
        try:
            async with db_manager.get_connection() as conn:
                result = await conn.execute(query, order_id, new_status.value)
                return result == "UPDATE 1"
                
        except Exception as e:
            self.log_error("Failed to update order status", error=str(e), order_id=str(order_id))
            raise
    
    async def delete(self, order_id: UUID) -> bool:
        """Delete an order"""
        query = "DELETE FROM orders WHERE id = $1"
        
        try:
            async with db_manager.get_connection() as conn:
                result = await conn.execute(query, order_id)
                return result == "DELETE 1"
                
        except Exception as e:
            self.log_error("Failed to delete order", error=str(e), order_id=str(order_id))
            raise
    
    async def list_by_customer(self, customer_id: UUID, limit: int = 100, offset: int = 0) -> List[Order]:
        """List orders by customer ID - Otimizado com índice composto"""
        # Query otimizada: usa índice idx_orders_customer_id + idx_orders_created_at
        # Para melhor performance com ORDER BY created_at DESC
        query = """
            SELECT id, customer_id, product_id, quantity, total_amount, status, created_at, updated_at
            FROM orders
            WHERE customer_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        """
        
        try:
            async with db_manager.get_connection() as conn:
                # Usar prepared statement para queries repetidas
                rows = await conn.fetch(query, customer_id, limit, offset)
                return [self._row_to_order(row) for row in rows]
                
        except Exception as e:
            self.log_error("Failed to list orders by customer", error=str(e), customer_id=customer_id)
            raise
    
    async def list_all(self, limit: int = 100, offset: int = 0) -> List[Order]:
        """List all orders - Otimizado com índice"""
        query = """
            SELECT id, customer_id, product_id, quantity, total_amount, status, created_at, updated_at
            FROM orders
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        """
        
        try:
            async with db_manager.get_connection() as conn:
                rows = await conn.fetch(query, limit, offset)
                return [self._row_to_order(row) for row in rows]
                
        except Exception as e:
            self.log_error("Failed to list all orders", error=str(e))
            raise
    
    async def create_with_outbox_event(self, order: Order, outbox_event: OutboxEvent, product_id: UUID = None, quantity: int = None) -> Order:
        """Create order, reserve stock, and outbox event in a single transaction (Transactional Outbox Pattern)
        
        Optimized for performance with minimal transaction time:
        - Uses explicit transaction for atomicity
        - Executes INSERTs and UPDATE in sequence (all in same transaction)
        - Prepared statements are automatically cached by asyncpg
        - Transaction commits immediately after all operations
        - JSON serialization done BEFORE transaction to reduce lock time
        
        If product_id and quantity are provided, stock will be reserved in the same transaction.
        """
        order_insert_query = """
            INSERT INTO orders (id, customer_id, product_id, quantity, total_amount, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, customer_id, product_id, quantity, total_amount, status, created_at, updated_at
        """
        
        outbox_insert_query = """
            INSERT INTO outbox_events (id, aggregate_id, aggregate_type, event_type, event_data, 
                                     created_at, processed_at, status, retry_count, max_retries)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        """
        
        stock_reserve_query = """
            UPDATE products
            SET stock_quantity = stock_quantity - $2, updated_at = NOW()
            WHERE id = $1 AND stock_quantity >= $2
            RETURNING stock_quantity
        """
        
        # OPTIMIZATION: Serialize JSON BEFORE transaction to reduce lock time
        # orjson is 2-3x faster than json.dumps() and reduces transaction overhead
        with profiler.measure("json_serialization"):
            event_data_json = orjson.dumps(outbox_event.event_data).decode('utf-8')
        
        try:
            with profiler.measure("db_connection"):
                async with db_manager.get_connection() as conn:
                    # Use explicit transaction with isolation level READ COMMITTED (default, fastest)
                    # This ensures all operations are atomic but with minimal locking overhead
                    with profiler.measure("db_transaction"):
                        async with conn.transaction():
                            # Reserve stock first (if provided) - this ensures stock is reserved before order creation
                            if product_id and quantity is not None:
                                with profiler.measure("db_reserve_stock"):
                                    stock_row = await conn.fetchrow(
                                        stock_reserve_query,
                                        product_id,
                                        quantity
                                    )
                                    if stock_row is None:
                                        # No rows updated means insufficient stock
                                        from app.domain.models.product import InsufficientStockError
                                        raise InsufficientStockError(
                                            f"Insufficient stock. Requested: {quantity}"
                                        )
                            
                            # Insert order
                            with profiler.measure("db_insert_order"):
                                order_row = await conn.fetchrow(
                                    order_insert_query,
                                    order.id,
                                    order.customer_id,
                                    order.product_id,
                                    order.quantity,
                                    order.total_amount,
                                    order.status.value,
                                    order.created_at,
                                    order.updated_at
                                )
                            
                            # Insert outbox event immediately after (same transaction)
                            # JSON already serialized before transaction to minimize lock time
                            with profiler.measure("db_insert_outbox"):
                                await conn.execute(
                                    outbox_insert_query,
                                    outbox_event.id,
                                    outbox_event.aggregate_id,
                                    outbox_event.aggregate_type,
                                    outbox_event.event_type,
                                    event_data_json,
                                    outbox_event.created_at,
                                    outbox_event.processed_at,
                                    outbox_event.status,
                                    outbox_event.retry_count,
                                    outbox_event.max_retries
                                )
                    
                    # Transaction commits automatically when exiting context
                    with profiler.measure("db_row_conversion"):
                        return self._row_to_order(order_row)
                    
        except asyncpg.exceptions.IntegrityConstraintViolationError as e:
            self.log_error("Order creation with outbox event failed - integrity error", error=str(e))
            raise
        except Exception as e:
            self.log_error("Order creation with outbox event failed", error=str(e))
            raise
    
    def _row_to_order(self, row: asyncpg.Record) -> Order:
        """Convert database row to Order domain model"""
        try:
            # Convert status string to OrderStatus enum
            status_str = row['status']
            if isinstance(status_str, str):
                status = OrderStatus(status_str)
            else:
                status = status_str
            
            return Order(
                id=row['id'],
                customer_id=row['customer_id'],
                product_id=row['product_id'],
                quantity=row['quantity'],
                total_amount=float(row['total_amount']),
                status=status,
                created_at=row['created_at'],
                updated_at=row['updated_at']
            )
        except Exception as e:
            self.log_error(
                "Failed to convert row to order",
                error=str(e),
                order_id=str(row.get('id', 'unknown')),
                status=str(row.get('status', 'unknown'))
            )
            raise

class OutboxEventRepository(OutboxEventRepositoryInterface, LoggerMixin):
    """PostgreSQL implementation of Outbox Event repository"""
    
    async def create(self, event: OutboxEvent) -> OutboxEvent:
        """Create a new outbox event"""
        query = """
            INSERT INTO outbox_events (id, aggregate_id, aggregate_type, event_type, event_data, 
                                     created_at, processed_at, status, retry_count, max_retries)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, aggregate_id, aggregate_type, event_type, event_data, created_at, 
                     processed_at, status, retry_count, max_retries
        """
        
        try:
            async with db_manager.get_connection() as conn:
                row = await conn.fetchrow(
                    query,
                    event.id,
                    event.aggregate_id,
                    event.aggregate_type,
                    event.event_type,
                    event.event_data,
                    event.created_at,
                    event.processed_at,
                    event.status,
                    event.retry_count,
                    event.max_retries
                )
                
                return self._row_to_event(row)
                
        except Exception as e:
            self.log_error("Failed to create outbox event", error=str(e))
            raise
    
    async def get_pending_events(self, limit: int = 100) -> List[OutboxEvent]:
        """Get pending events for processing"""
        query = """
            SELECT id, aggregate_id, aggregate_type, event_type, event_data, created_at,
                   processed_at, status, retry_count, max_retries
            FROM outbox_events
            WHERE status = 'PENDING'
            ORDER BY created_at ASC
            LIMIT $1
        """
        
        try:
            async with db_manager.get_connection() as conn:
                rows = await conn.fetch(query, limit)
                return [self._row_to_event(row) for row in rows]
                
        except Exception as e:
            self.log_error("Failed to get pending events", error=str(e))
            raise
    
    async def update(self, event: OutboxEvent) -> OutboxEvent:
        """Update an existing event"""
        query = """
            UPDATE outbox_events
            SET processed_at = $2, status = $3, retry_count = $4
            WHERE id = $1
            RETURNING id, aggregate_id, aggregate_type, event_type, event_data, created_at,
                     processed_at, status, retry_count, max_retries
        """
        
        try:
            async with db_manager.get_connection() as conn:
                row = await conn.fetchrow(
                    query,
                    event.id,
                    event.processed_at,
                    event.status,
                    event.retry_count
                )
                
                return self._row_to_event(row)
                
        except Exception as e:
            self.log_error("Failed to update outbox event", error=str(e), event_id=str(event.id))
            raise
    
    async def mark_as_processed(self, event_id: UUID) -> bool:
        """Mark event as processed"""
        query = """
            UPDATE outbox_events
            SET status = 'PROCESSED', processed_at = NOW()
            WHERE id = $1
        """
        
        try:
            async with db_manager.get_connection() as conn:
                result = await conn.execute(query, event_id)
                return result == "UPDATE 1"
                
        except Exception as e:
            self.log_error("Failed to mark event as processed", error=str(e), event_id=str(event_id))
            raise
    
    async def increment_retry(self, event_id: UUID) -> bool:
        """Increment retry count for event"""
        query = """
            UPDATE outbox_events
            SET retry_count = retry_count + 1,
                status = CASE WHEN retry_count >= max_retries THEN 'FAILED' ELSE 'PENDING' END
            WHERE id = $1
        """
        
        try:
            async with db_manager.get_connection() as conn:
                result = await conn.execute(query, event_id)
                return result == "UPDATE 1"
                
        except Exception as e:
            self.log_error("Failed to increment retry count", error=str(e), event_id=str(event_id))
            raise
    
    def _row_to_event(self, row: asyncpg.Record) -> OutboxEvent:
        """Convert database row to OutboxEvent domain model"""
        return OutboxEvent(
            id=row['id'],
            aggregate_id=row['aggregate_id'],
            aggregate_type=row['aggregate_type'],
            event_type=row['event_type'],
            event_data=row['event_data'],
            created_at=row['created_at'],
            processed_at=row['processed_at'],
            status=row['status'],
            retry_count=row['retry_count'],
            max_retries=row['max_retries']
        )

class ProductRepository(ProductRepositoryInterface, LoggerMixin):
    """PostgreSQL implementation of Product repository"""
    
    async def create(self, product: Product) -> Product:
        """Create a new product"""
        query = """
            INSERT INTO products (id, name, description, price, sku, stock_quantity, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, name, description, price, sku, stock_quantity, created_at, updated_at
        """
        
        try:
            async with db_manager.get_connection() as conn:
                row = await conn.fetchrow(
                    query,
                    product.id,
                    product.name,
                    product.description,
                    product.price,
                    product.sku,
                    product.stock_quantity,
                    product.created_at,
                    product.updated_at
                )
                
                return self._row_to_product(row)
                
        except asyncpg.exceptions.UniqueViolationError as e:
            self.log_error("Product creation failed - duplicate SKU", error=str(e))
            raise
        except Exception as e:
            self.log_error("Product creation failed", error=str(e))
            raise
    
    async def get_by_id(self, product_id: UUID) -> Optional[Product]:
        """Get product by ID"""
        query = """
            SELECT id, name, description, price, sku, stock_quantity, created_at, updated_at
            FROM products
            WHERE id = $1
        """
        
        try:
            async with db_manager.get_connection() as conn:
                row = await conn.fetchrow(query, product_id)
                
                if row:
                    return self._row_to_product(row)
                return None
                
        except Exception as e:
            self.log_error("Failed to get product by ID", error=str(e), product_id=str(product_id))
            raise
    
    async def get_by_sku(self, sku: str) -> Optional[Product]:
        """Get product by SKU"""
        query = """
            SELECT id, name, description, price, sku, stock_quantity, created_at, updated_at
            FROM products
            WHERE sku = $1
        """
        
        try:
            async with db_manager.get_connection() as conn:
                row = await conn.fetchrow(query, sku)
                
                if row:
                    return self._row_to_product(row)
                return None
                
        except Exception as e:
            self.log_error("Failed to get product by SKU", error=str(e), sku=sku)
            raise
    
    async def update(self, product: Product) -> Product:
        """Update an existing product"""
        query = """
            UPDATE products
            SET name = $2, description = $3, price = $4, sku = $5, 
                stock_quantity = $6, updated_at = $7
            WHERE id = $1
            RETURNING id, name, description, price, sku, stock_quantity, created_at, updated_at
        """
        
        try:
            async with db_manager.get_connection() as conn:
                row = await conn.fetchrow(
                    query,
                    product.id,
                    product.name,
                    product.description,
                    product.price,
                    product.sku,
                    product.stock_quantity,
                    product.updated_at
                )
                
                return self._row_to_product(row)
                
        except Exception as e:
            self.log_error("Failed to update product", error=str(e), product_id=str(product.id))
            raise
    
    async def delete(self, product_id: UUID) -> bool:
        """Delete a product"""
        query = "DELETE FROM products WHERE id = $1"
        
        try:
            async with db_manager.get_connection() as conn:
                result = await conn.execute(query, product_id)
                return result == "DELETE 1"
                
        except Exception as e:
            self.log_error("Failed to delete product", error=str(e), product_id=str(product_id))
            raise
    
    async def list_all(self, limit: int = 100, offset: int = 0) -> List[Product]:
        """List all products"""
        query = """
            SELECT id, name, description, price, sku, stock_quantity, created_at, updated_at
            FROM products
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        """
        
        try:
            async with db_manager.get_connection() as conn:
                rows = await conn.fetch(query, limit, offset)
                return [self._row_to_product(row) for row in rows]
                
        except Exception as e:
            self.log_error("Failed to list products", error=str(e))
            raise
    
    async def update_stock(self, product_id: UUID, quantity: int) -> bool:
        """Update product stock quantity (add or subtract)"""
        query = """
            UPDATE products
            SET stock_quantity = stock_quantity + $2, updated_at = NOW()
            WHERE id = $1
            RETURNING stock_quantity
        """
        
        try:
            async with db_manager.get_connection() as conn:
                row = await conn.fetchrow(query, product_id, quantity)
                if row and row['stock_quantity'] < 0:
                    return False
                return True
                
        except Exception as e:
            self.log_error("Failed to update stock", error=str(e), product_id=str(product_id))
            raise
    
    async def reserve_stock(self, product_id: UUID, quantity: int) -> bool:
        """Reserve stock by decreasing quantity. Returns True if successful, False if insufficient stock."""
        query = """
            UPDATE products
            SET stock_quantity = stock_quantity - $2, updated_at = NOW()
            WHERE id = $1 AND stock_quantity >= $2
            RETURNING stock_quantity
        """
        
        try:
            async with db_manager.get_connection() as conn:
                row = await conn.fetchrow(query, product_id, quantity)
                if row is None:
                    # No rows updated means insufficient stock
                    return False
                return True
                
        except Exception as e:
            self.log_error("Failed to reserve stock", error=str(e), product_id=str(product_id))
            raise
    
    def _row_to_product(self, row: asyncpg.Record) -> Product:
        """Convert database row to Product domain model"""
        return Product(
            id=row['id'],
            name=row['name'],
            description=row['description'],
            price=float(row['price']),
            sku=row['sku'],
            stock_quantity=row['stock_quantity'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )

class CustomerRepository(CustomerRepositoryInterface, LoggerMixin):
    """PostgreSQL implementation of Customer repository"""
    
    async def create(self, customer: Customer) -> Customer:
        """Create a new customer"""
        query = """
            INSERT INTO customers (id, name, email, phone, address, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, name, email, phone, address, created_at, updated_at
        """
        
        try:
            async with db_manager.get_connection() as conn:
                row = await conn.fetchrow(
                    query,
                    customer.id,
                    customer.name,
                    customer.email,
                    customer.phone,
                    customer.address,
                    customer.created_at,
                    customer.updated_at
                )
                
                return self._row_to_customer(row)
                
        except asyncpg.exceptions.UniqueViolationError as e:
            self.log_error("Customer creation failed - duplicate email", error=str(e))
            raise
        except Exception as e:
            self.log_error("Customer creation failed", error=str(e))
            raise
    
    async def get_by_id(self, customer_id: UUID) -> Optional[Customer]:
        """Get customer by ID"""
        query = """
            SELECT id, name, email, phone, address, created_at, updated_at
            FROM customers
            WHERE id = $1
        """
        
        try:
            async with db_manager.get_connection() as conn:
                row = await conn.fetchrow(query, customer_id)
                
                if row:
                    return self._row_to_customer(row)
                return None
                
        except Exception as e:
            self.log_error("Failed to get customer by ID", error=str(e), customer_id=str(customer_id))
            raise
    
    async def get_by_email(self, email: str) -> Optional[Customer]:
        """Get customer by email"""
        query = """
            SELECT id, name, email, phone, address, created_at, updated_at
            FROM customers
            WHERE email = $1
        """
        
        try:
            async with db_manager.get_connection() as conn:
                row = await conn.fetchrow(query, email)
                
                if row:
                    return self._row_to_customer(row)
                return None
                
        except Exception as e:
            self.log_error("Failed to get customer by email", error=str(e), email=email)
            raise
    
    async def update(self, customer: Customer) -> Customer:
        """Update an existing customer"""
        query = """
            UPDATE customers
            SET name = $2, email = $3, phone = $4, address = $5, updated_at = $6
            WHERE id = $1
            RETURNING id, name, email, phone, address, created_at, updated_at
        """
        
        try:
            async with db_manager.get_connection() as conn:
                row = await conn.fetchrow(
                    query,
                    customer.id,
                    customer.name,
                    customer.email,
                    customer.phone,
                    customer.address,
                    customer.updated_at
                )
                
                return self._row_to_customer(row)
                
        except Exception as e:
            self.log_error("Failed to update customer", error=str(e), customer_id=str(customer.id))
            raise
    
    async def delete(self, customer_id: UUID) -> bool:
        """Delete a customer"""
        query = "DELETE FROM customers WHERE id = $1"
        
        try:
            async with db_manager.get_connection() as conn:
                result = await conn.execute(query, customer_id)
                return result == "DELETE 1"
                
        except Exception as e:
            self.log_error("Failed to delete customer", error=str(e), customer_id=str(customer_id))
            raise
    
    async def list_all(self, limit: int = 100, offset: int = 0) -> List[Customer]:
        """List all customers"""
        query = """
            SELECT id, name, email, phone, address, created_at, updated_at
            FROM customers
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        """
        
        try:
            async with db_manager.get_connection() as conn:
                rows = await conn.fetch(query, limit, offset)
                return [self._row_to_customer(row) for row in rows]
                
        except Exception as e:
            self.log_error("Failed to list customers", error=str(e))
            raise
    
    def _row_to_customer(self, row: asyncpg.Record) -> Customer:
        """Convert database row to Customer domain model"""
        return Customer(
            id=row['id'],
            name=row['name'],
            email=row['email'],
            phone=row['phone'],
            address=row['address'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )
