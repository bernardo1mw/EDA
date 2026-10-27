package infrastructure

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/bernardo1mw/EDA/services/inventory-service/internal/domain"
	amqp "github.com/rabbitmq/amqp091-go"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

type amqpPublisher struct {
	channel *amqp.Channel
}

func NewEventPublisher(channel *amqp.Channel) domain.EventPublisher {
	return &amqpPublisher{channel: channel}
}

func (p *amqpPublisher) PublishInventoryEvent(ctx context.Context, event domain.InventoryEvent) error {
	eventData, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal inventory event: %w", err)
	}

	var exchange, routingKey string
	if event.Status == "reserved" {
		exchange = "amq.topic"
		routingKey = "inventory.reserved"
	} else {
		exchange = "amq.topic"
		routingKey = "inventory.rejected"
	}

	return p.channel.Publish(
		exchange,
		routingKey,
		false,
		false,
		amqp.Publishing{
			ContentType: "application/json",
			Body:        eventData,
			Timestamp:   time.Now(),
			MessageId:   event.InventoryID,
			Headers: amqp.Table{
				"event_type":   fmt.Sprintf("inventory.%s", event.Status),
				"order_id":     event.OrderID,
				"inventory_id": event.InventoryID,
			},
		},
	)
}

type Consumer struct {
	channel *amqp.Channel
	handler func(ctx context.Context, event domain.PaymentEvent) error
	tracer  trace.Tracer
}

func NewConsumer(
	channel *amqp.Channel,
	handler func(ctx context.Context, event domain.PaymentEvent) error,
	tracer trace.Tracer,
) *Consumer {
	return &Consumer{channel: channel, handler: handler, tracer: tracer}
}

func (c *Consumer) Start(ctx context.Context) error {
	log.Println("Starting Inventory Service...")

	log.Println("Declaring exchange: amq.topic")
	err := c.channel.ExchangeDeclare(
		"amq.topic",
		"topic",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Printf("Failed to declare exchange: %v", err)
		return fmt.Errorf("failed to declare exchange: %w", err)
	}
	log.Printf("Exchange declared successfully: amq.topic")

	log.Println("Declaring queue: payment.authorized")
	queue, err := c.channel.QueueDeclare(
		"payment.authorized",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Printf("Failed to declare queue: %v", err)
		return fmt.Errorf("failed to declare queue: %w", err)
	}
	log.Printf("Queue declared successfully: %s", queue.Name)

	log.Println("Binding queue to exchange with routing key: payment.authorized")
	err = c.channel.QueueBind(
		queue.Name,
		"payment.authorized",
		"amq.topic",
		false,
		nil,
	)
	if err != nil {
		log.Printf("Failed to bind queue: %v", err)
		return fmt.Errorf("failed to bind queue: %w", err)
	}
	log.Printf("Queue bound successfully to exchange amq.topic")

	log.Println("Starting to consume messages from queue:", queue.Name)
	msgs, err := c.channel.Consume(
		queue.Name,
		"",
		false,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Printf("Failed to register consumer: %v", err)
		return fmt.Errorf("failed to register consumer: %w", err)
	}
	log.Println("Consumer registered successfully")
	log.Println("Inventory Service consumer started")

	for {
		select {
		case <-ctx.Done():
			log.Println("Inventory Service stopped")
			return ctx.Err()
		case msg := <-msgs:
			c.processMessage(ctx, msg)
		}
	}
}

func (c *Consumer) processMessage(ctx context.Context, msg amqp.Delivery) {
	ctx, span := c.tracer.Start(ctx, "process_message")
	defer span.End()

	var event domain.PaymentEvent
	log.Printf("Received payment event message: %s", string(msg.Body))
	if err := json.Unmarshal(msg.Body, &event); err != nil {
		log.Printf("Error unmarshaling message: %v", err)
		msg.Nack(false, false)
		return
	}
	log.Printf("Successfully unmarshaled payment event: %+v", event)

	span.SetAttributes(
		attribute.String("message.id", msg.MessageId),
		attribute.String("payment.id", event.PaymentID),
	)

	if err := c.handler(ctx, event); err != nil {
		log.Printf("Error processing payment authorized: %v", err)
		msg.Nack(false, true) // Requeue for retry
		return
	}

	msg.Ack(false)
	span.SetStatus(codes.Ok, "Message processed successfully")
}
