# Infrastructure Layer - RabbitMQ Consumer for Inventory Events
import asyncio
import json
import logging
from uuid import UUID
import aio_pika
from aio_pika import IncomingMessage

from app.domain.models.order import OrderStatus
from app.infrastructure.database.repositories import OrderRepository
from app.core.logging import LoggerMixin

logger = logging.getLogger(__name__)

class InventoryEventConsumer(LoggerMixin):
    """Consumer for inventory.reserved and inventory.rejected events to update order status"""
    
    def __init__(self, order_repository: OrderRepository):
        self.order_repository = order_repository
        self.connection = None
        self.channel = None
        self.reserved_queue = None
        self.rejected_queue = None
    
    async def connect(self, rabbitmq_url: str):
        """Connect to RabbitMQ"""
        try:
            self.connection = await aio_pika.connect_robust(rabbitmq_url)
            self.channel = await self.connection.channel()
            await self.channel.set_qos(prefetch_count=10)
            
            # Declare exchange
            exchange = await self.channel.declare_exchange(
                "amq.topic",
                aio_pika.ExchangeType.TOPIC,
                durable=True
            )
            
            # Declare queue for inventory.reserved
            self.reserved_queue = await self.channel.declare_queue(
                "inventory.reserved.orders",
                durable=True
            )
            
            # Declare queue for inventory.rejected
            self.rejected_queue = await self.channel.declare_queue(
                "inventory.rejected.orders",
                durable=True
            )
            
            # Bind queues to exchange
            await self.reserved_queue.bind(exchange, routing_key="inventory.reserved")
            await self.rejected_queue.bind(exchange, routing_key="inventory.rejected")
            
            self.log_info("Connected to RabbitMQ and bound to inventory.reserved and inventory.rejected queues")
            
        except Exception as e:
            self.log_error("Failed to connect to RabbitMQ", error=str(e))
            raise
    
    async def disconnect(self):
        """Disconnect from RabbitMQ"""
        try:
            if self.channel:
                await self.channel.close()
            if self.connection:
                await self.connection.close()
            self.log_info("Disconnected from RabbitMQ")
        except Exception as e:
            self.log_error("Error disconnecting from RabbitMQ", error=str(e))
    
    async def process_reserved_message(self, message: IncomingMessage):
        """Process inventory.reserved event message"""
        async with message.process():
            try:
                # Parse message
                event_data = json.loads(message.body.decode())
                
                self.log_info("Received inventory.reserved event", event_data=event_data)
                
                order_id = event_data.get("orderId") or event_data.get("order_id")
                status = event_data.get("status")
                
                if not order_id:
                    self.log_error("Missing order_id in inventory event", event_data=event_data)
                    return
                
                if status != "reserved":
                    self.log_info("Ignoring inventory event with status", status=status, order_id=order_id)
                    return
                
                # Update order status to COMPLETED
                order_uuid = UUID(order_id)
                success = await self.order_repository.update_status(
                    order_uuid,
                    OrderStatus.COMPLETED
                )
                
                if success:
                    self.log_info(
                        "Order status updated to COMPLETED",
                        order_id=order_id,
                        operation="process_inventory_reserved"
                    )
                else:
                    self.log_error(
                        "Failed to update order status",
                        order_id=order_id,
                        operation="process_inventory_reserved"
                    )
                    
            except json.JSONDecodeError as e:
                self.log_error("Failed to parse inventory event message", error=str(e))
            except ValueError as e:
                self.log_error("Invalid UUID in inventory event", error=str(e))
            except Exception as e:
                self.log_error("Failed to process inventory event", error=str(e))
                # Re-raise to trigger nack
                raise
    
    async def process_rejected_message(self, message: IncomingMessage):
        """Process inventory.rejected event message"""
        async with message.process():
            try:
                # Parse message
                event_data = json.loads(message.body.decode())
                
                self.log_info("Received inventory.rejected event", event_data=event_data)
                
                order_id = event_data.get("orderId") or event_data.get("order_id")
                status = event_data.get("status")
                
                if not order_id:
                    self.log_error("Missing order_id in inventory event", event_data=event_data)
                    return
                
                if status != "rejected":
                    self.log_info("Ignoring inventory event with status", status=status, order_id=order_id)
                    return
                
                # Update order status to FAILED
                order_uuid = UUID(order_id)
                success = await self.order_repository.update_status(
                    order_uuid,
                    OrderStatus.FAILED
                )
                
                if success:
                    self.log_info(
                        "Order status updated to FAILED",
                        order_id=order_id,
                        operation="process_inventory_rejected"
                    )
                else:
                    self.log_error(
                        "Failed to update order status",
                        order_id=order_id,
                        operation="process_inventory_rejected"
                    )
                    
            except json.JSONDecodeError as e:
                self.log_error("Failed to parse inventory event message", error=str(e))
            except ValueError as e:
                self.log_error("Invalid UUID in inventory event", error=str(e))
            except Exception as e:
                self.log_error("Failed to process inventory event", error=str(e))
                # Re-raise to trigger nack
                raise
    
    async def start_consuming(self):
        """Start consuming messages from both queues"""
        if not self.reserved_queue or not self.rejected_queue:
            raise RuntimeError("Queues not initialized. Call connect() first.")
        
        self.log_info("Starting to consume inventory.reserved and inventory.rejected events")
        
        # Start consuming from both queues
        await self.reserved_queue.consume(self.process_reserved_message)
        await self.rejected_queue.consume(self.process_rejected_message)
        
        self.log_info("Started consuming inventory.reserved and inventory.rejected events")
