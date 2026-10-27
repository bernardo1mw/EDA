#!/bin/bash

# RabbitMQ initialization script
# This script configures exchanges, queues, and routing for the Event Stream Orders system

RABBITMQ_HOST=${RABBITMQ_HOST:-rabbitmq}
RA="rabbitmqadmin --host $RABBITMQ_HOST"

# Wait for RabbitMQ management API to be ready
until curl -s -f "http://$RABBITMQ_HOST:15672/" > /dev/null 2>&1; do
    echo "Waiting for RabbitMQ to start..."
    sleep 2
done

# Create exchanges
$RA declare exchange name=order.events type=topic durable=true
$RA declare exchange name=payment.events type=topic durable=true
$RA declare exchange name=inventory.events type=topic durable=true
$RA declare exchange name=notification.events type=topic durable=true

# Create dead-letter exchanges (used as DLX for main queues)
$RA declare exchange name=order.dlx type=topic durable=true
$RA declare exchange name=payment.dlx type=topic durable=true
$RA declare exchange name=inventory.dlx type=topic durable=true
$RA declare exchange name=notification.dlx type=topic durable=true

# Create main queues with dead-letter routing to retry queues
$RA declare queue name=order.created durable=true arguments='{"x-dead-letter-exchange":"order.dlx","x-dead-letter-routing-key":"order.created.retry"}'
$RA declare queue name=payment.authorized durable=true arguments='{"x-dead-letter-exchange":"payment.dlx","x-dead-letter-routing-key":"payment.authorized.retry"}'
$RA declare queue name=payment.declined durable=true arguments='{"x-dead-letter-exchange":"payment.dlx","x-dead-letter-routing-key":"payment.declined.retry"}'
$RA declare queue name=inventory.reserved durable=true arguments='{"x-dead-letter-exchange":"inventory.dlx","x-dead-letter-routing-key":"inventory.reserved.retry"}'
$RA declare queue name=inventory.rejected durable=true arguments='{"x-dead-letter-exchange":"inventory.dlx","x-dead-letter-routing-key":"inventory.rejected.retry"}'
$RA declare queue name=notification.sent durable=true arguments='{"x-dead-letter-exchange":"notification.dlx","x-dead-letter-routing-key":"notification.sent.retry"}'

# Create Dead Letter Queues
$RA declare queue name=order.created.dlq durable=true
$RA declare queue name=payment.authorized.dlq durable=true
$RA declare queue name=payment.declined.dlq durable=true
$RA declare queue name=inventory.reserved.dlq durable=true
$RA declare queue name=inventory.rejected.dlq durable=true
$RA declare queue name=notification.sent.dlq durable=true

# Create retry queues
$RA declare queue name=order.created.retry durable=true arguments='{"x-message-ttl":30000,"x-dead-letter-exchange":"order.events","x-dead-letter-routing-key":"order.created"}'
$RA declare queue name=payment.authorized.retry durable=true arguments='{"x-message-ttl":30000,"x-dead-letter-exchange":"payment.events","x-dead-letter-routing-key":"payment.authorized"}'
$RA declare queue name=payment.declined.retry durable=true arguments='{"x-message-ttl":30000,"x-dead-letter-exchange":"payment.events","x-dead-letter-routing-key":"payment.declined"}'
$RA declare queue name=inventory.reserved.retry durable=true arguments='{"x-message-ttl":30000,"x-dead-letter-exchange":"inventory.events","x-dead-letter-routing-key":"inventory.reserved"}'
$RA declare queue name=inventory.rejected.retry durable=true arguments='{"x-message-ttl":30000,"x-dead-letter-exchange":"inventory.events","x-dead-letter-routing-key":"inventory.rejected"}'
$RA declare queue name=notification.sent.retry durable=true arguments='{"x-message-ttl":30000,"x-dead-letter-exchange":"notification.events","x-dead-letter-routing-key":"notification.sent"}'

# Bind DLX exchanges to retry queues (NACK from main queue -> DLX -> retry queue)
$RA declare binding source=order.dlx destination=order.created.retry routing_key=order.created.retry
$RA declare binding source=payment.dlx destination=payment.authorized.retry routing_key=payment.authorized.retry
$RA declare binding source=payment.dlx destination=payment.declined.retry routing_key=payment.declined.retry
$RA declare binding source=inventory.dlx destination=inventory.reserved.retry routing_key=inventory.reserved.retry
$RA declare binding source=inventory.dlx destination=inventory.rejected.retry routing_key=inventory.rejected.retry
$RA declare binding source=notification.dlx destination=notification.sent.retry routing_key=notification.sent.retry

# Bind queues to exchanges
$RA declare binding source=order.events destination=order.created routing_key=order.created
$RA declare binding source=payment.events destination=payment.authorized routing_key=payment.authorized
$RA declare binding source=payment.events destination=payment.declined routing_key=payment.declined
$RA declare binding source=inventory.events destination=inventory.reserved routing_key=inventory.reserved
$RA declare binding source=inventory.events destination=inventory.rejected routing_key=inventory.rejected
$RA declare binding source=notification.events destination=notification.sent routing_key=notification.sent

# Bind DLQs to exchanges
$RA declare binding source=order.events destination=order.created.dlq routing_key=order.created.dlq
$RA declare binding source=payment.events destination=payment.authorized.dlq routing_key=payment.authorized.dlq
$RA declare binding source=payment.events destination=payment.declined.dlq routing_key=payment.declined.dlq
$RA declare binding source=inventory.events destination=inventory.reserved.dlq routing_key=inventory.reserved.dlq
$RA declare binding source=inventory.events destination=inventory.rejected.dlq routing_key=inventory.rejected.dlq
$RA declare binding source=notification.events destination=notification.sent.dlq routing_key=notification.sent.dlq

echo "RabbitMQ configuration completed successfully!"

