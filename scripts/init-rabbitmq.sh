#!/bin/bash

# RabbitMQ initialization script
# This script configures exchanges, queues, and routing for the Event Stream Orders system

# Wait for RabbitMQ to be ready
until rabbitmq-diagnostics -q ping; do
    echo "Waiting for RabbitMQ to start..."
    sleep 2
done

# Enable management plugin
rabbitmq-plugins enable rabbitmq_management

# Create exchanges
rabbitmqadmin declare exchange name=order.events type=topic durable=true
rabbitmqadmin declare exchange name=payment.events type=topic durable=true
rabbitmqadmin declare exchange name=inventory.events type=topic durable=true
rabbitmqadmin declare exchange name=notification.events type=topic durable=true

# Create main queues
rabbitmqadmin declare queue name=order.created durable=true
rabbitmqadmin declare queue name=payment.authorized durable=true
rabbitmqadmin declare queue name=payment.declined durable=true
rabbitmqadmin declare queue name=inventory.reserved durable=true
rabbitmqadmin declare queue name=inventory.rejected durable=true
rabbitmqadmin declare queue name=notification.sent durable=true

# Create Dead Letter Queues
rabbitmqadmin declare queue name=order.created.dlq durable=true
rabbitmqadmin declare queue name=payment.authorized.dlq durable=true
rabbitmqadmin declare queue name=payment.declined.dlq durable=true
rabbitmqadmin declare queue name=inventory.reserved.dlq durable=true
rabbitmqadmin declare queue name=inventory.rejected.dlq durable=true
rabbitmqadmin declare queue name=notification.sent.dlq durable=true

# Create retry queues
rabbitmqadmin declare queue name=order.created.retry durable=true arguments='{"x-message-ttl":30000,"x-dead-letter-exchange":"order.events","x-dead-letter-routing-key":"order.created"}'
rabbitmqadmin declare queue name=payment.authorized.retry durable=true arguments='{"x-message-ttl":30000,"x-dead-letter-exchange":"payment.events","x-dead-letter-routing-key":"payment.authorized"}'
rabbitmqadmin declare queue name=payment.declined.retry durable=true arguments='{"x-message-ttl":30000,"x-dead-letter-exchange":"payment.events","x-dead-letter-routing-key":"payment.declined"}'
rabbitmqadmin declare queue name=inventory.reserved.retry durable=true arguments='{"x-message-ttl":30000,"x-dead-letter-exchange":"inventory.events","x-dead-letter-routing-key":"inventory.reserved"}'
rabbitmqadmin declare queue name=inventory.rejected.retry durable=true arguments='{"x-message-ttl":30000,"x-dead-letter-exchange":"inventory.events","x-dead-letter-routing-key":"inventory.rejected"}'
rabbitmqadmin declare queue name=notification.sent.retry durable=true arguments='{"x-message-ttl":30000,"x-dead-letter-exchange":"notification.events","x-dead-letter-routing-key":"notification.sent"}'

# Bind queues to exchanges
rabbitmqadmin declare binding source=order.events destination=order.created routing_key=order.created
rabbitmqadmin declare binding source=payment.events destination=payment.authorized routing_key=payment.authorized
rabbitmqadmin declare binding source=payment.events destination=payment.declined routing_key=payment.declined
rabbitmqadmin declare binding source=inventory.events destination=inventory.reserved routing_key=inventory.reserved
rabbitmqadmin declare binding source=inventory.events destination=inventory.rejected routing_key=inventory.rejected
rabbitmqadmin declare binding source=notification.events destination=notification.sent routing_key=notification.sent

# Bind DLQs to exchanges
rabbitmqadmin declare binding source=order.events destination=order.created.dlq routing_key=order.created.dlq
rabbitmqadmin declare binding source=payment.events destination=payment.authorized.dlq routing_key=payment.authorized.dlq
rabbitmqadmin declare binding source=payment.events destination=payment.declined.dlq routing_key=payment.declined.dlq
rabbitmqadmin declare binding source=inventory.events destination=inventory.reserved.dlq routing_key=inventory.reserved.dlq
rabbitmqadmin declare binding source=inventory.events destination=inventory.rejected.dlq routing_key=inventory.rejected.dlq
rabbitmqadmin declare binding source=notification.events destination=notification.sent.dlq routing_key=notification.sent.dlq

echo "RabbitMQ configuration completed successfully!"

