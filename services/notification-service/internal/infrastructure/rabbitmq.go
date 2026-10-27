package infrastructure

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/bernardo1mw/EDA/services/notification-service/internal/domain"
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

func (p *amqpPublisher) PublishNotificationEvent(ctx context.Context, event domain.NotificationEvent) error {
	eventData, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal notification event: %w", err)
	}

	return p.channel.Publish(
		"amq.topic",
		"notification.sent",
		false,
		false,
		amqp.Publishing{
			ContentType: "application/json",
			Body:        eventData,
			Timestamp:   time.Now(),
			MessageId:   event.NotificationID,
			Headers: amqp.Table{
				"event_type":      "notification.sent",
				"order_id":        event.OrderID,
				"notification_id": event.NotificationID,
			},
		},
	)
}

type Consumer struct {
	channel *amqp.Channel
	handler func(ctx context.Context, event domain.InventoryEvent) error
	tracer  trace.Tracer
}

func NewConsumer(
	channel *amqp.Channel,
	handler func(ctx context.Context, event domain.InventoryEvent) error,
	tracer trace.Tracer,
) *Consumer {
	return &Consumer{channel: channel, handler: handler, tracer: tracer}
}

func (c *Consumer) Start(ctx context.Context) error {
	log.Println("Starting Notification Service...")

	queue, err := c.channel.QueueDeclare(
		"inventory.reserved",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to declare queue: %w", err)
	}

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
		return fmt.Errorf("failed to register consumer: %w", err)
	}

	log.Println("Notification Service consumer started")

	for {
		select {
		case <-ctx.Done():
			log.Println("Notification Service stopped")
			return ctx.Err()
		case msg := <-msgs:
			c.processMessage(ctx, msg)
		}
	}
}

func (c *Consumer) processMessage(ctx context.Context, msg amqp.Delivery) {
	ctx, span := c.tracer.Start(ctx, "process_message")
	defer span.End()

	var event domain.InventoryEvent
	if err := json.Unmarshal(msg.Body, &event); err != nil {
		log.Printf("Error unmarshaling message: %v", err)
		msg.Nack(false, false)
		return
	}

	span.SetAttributes(
		attribute.String("message.id", msg.MessageId),
		attribute.String("inventory.id", event.InventoryID),
	)

	if err := c.handler(ctx, event); err != nil {
		log.Printf("Error processing inventory reserved: %v", err)
		msg.Nack(false, true) // Requeue for retry
		return
	}

	msg.Ack(false)
	span.SetStatus(codes.Ok, "Message processed successfully")
}
