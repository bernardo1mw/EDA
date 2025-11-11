# Infrastructure Layer - Event Publisher
import json
import logging
from typing import Optional
import aio_pika
from aio_pika import Message, DeliveryMode

from app.domain.models.order import Order, OutboxEvent
from app.domain.interfaces.repositories import EventPublisherInterface
from app.core.config import settings
from app.core.logging import LoggerMixin

logger = logging.getLogger(__name__)

class RabbitMQEventPublisher(EventPublisherInterface, LoggerMixin):
    """RabbitMQ implementation of Event Publisher"""
    
    def __init__(self):
        self.connection: Optional[aio_pika.Connection] = None
        self.channel: Optional[aio_pika.Channel] = None
    
    async def connect(self):
        """Connect to RabbitMQ"""
        try:
            self.connection = await aio_pika.connect_robust(settings.rabbitmq_url)
            self.channel = await self.connection.channel()
            
            # Declare exchange
            await self.channel.declare_exchange(
                "amq.topic",
                aio_pika.ExchangeType.TOPIC,
                durable=True
            )
            
            self.log_info("Connected to RabbitMQ successfully")
            
        except Exception as e:
            self.log_error("Failed to connect to RabbitMQ", error=str(e))
            raise
    
    async def disconnect(self):
        """Disconnect from RabbitMQ"""
        if self.connection and not self.connection.is_closed:
            await self.connection.close()
            self.log_info("Disconnected from RabbitMQ")
    
    async def publish_event(self, event: OutboxEvent) -> bool:
        """Publish an event to message broker"""
        try:
            if not self.channel or self.channel.is_closed:
                await self.connect()
            
            # Determine routing key based on event type
            routing_key = self._get_routing_key(event.event_type)
            
            # Create message
            message = Message(
                body=json.dumps(event.event_data).encode(),
                delivery_mode=DeliveryMode.PERSISTENT,
                message_id=str(event.id),
                headers={
                    "event_type": event.event_type,
                    "aggregate_id": str(event.aggregate_id),
                    "aggregate_type": event.aggregate_type,
                }
            )
            
            # Publish message
            await self.channel.default_exchange.publish(
                message,
                routing_key=routing_key
            )
            
            self.log_info(
                "Event published successfully",
                event_id=str(event.id),
                event_type=event.event_type,
                routing_key=routing_key,
                operation="publish_event"
            )
            
            return True
            
        except Exception as e:
            self.log_error(
                "Failed to publish event",
                error=str(e),
                event_id=str(event.id),
                event_type=event.event_type,
                operation="publish_event"
            )
            return False
    
    async def publish_order_created(
        self,
        order: Order,
        trace_id: Optional[str] = None,
        span_id: Optional[str] = None
    ) -> bool:
        """Publish order.created event"""
        try:
            # Create event data
            event_data = {
                "order_id": str(order.id),
                "customer_id": order.customer_id,
                "product_id": order.product_id,
                "quantity": order.quantity,
                "total_amount": order.total_amount,
                "created_at": order.created_at.isoformat(),
                "trace_id": trace_id,
                "span_id": span_id
            }
            
            if not self.channel or self.channel.is_closed:
                await self.connect()
            
            # Create message
            message = Message(
                body=json.dumps(event_data).encode(),
                delivery_mode=DeliveryMode.PERSISTENT,
                message_id=str(order.id),
                headers={
                    "event_type": "order.created",
                    "order_id": str(order.id),
                    "customer_id": order.customer_id,
                }
            )
            
            # Publish message
            await self.channel.default_exchange.publish(
                message,
                routing_key="order.created"
            )
            
            self.log_info(
                "Order created event published successfully",
                order_id=str(order.id),
                customer_id=order.customer_id,
                product_id=order.product_id,
                trace_id=trace_id,
                span_id=span_id,
                operation="publish_order_created"
            )
            
            return True
            
        except Exception as e:
            self.log_error(
                "Failed to publish order created event",
                error=str(e),
                order_id=str(order.id),
                customer_id=order.customer_id,
                trace_id=trace_id,
                span_id=span_id,
                operation="publish_order_created"
            )
            return False
    
    def _get_routing_key(self, event_type: str) -> str:
        """Get routing key for event type"""
        routing_keys = {
            "order.created": "order.created",
            "payment.authorized": "payment.authorized",
            "payment.declined": "payment.declined",
            "inventory.reserved": "inventory.reserved",
            "inventory.rejected": "inventory.rejected",
            "notification.sent": "notification.sent",
        }
        
        return routing_keys.get(event_type, event_type)

# Global event publisher instance
event_publisher = RabbitMQEventPublisher()
