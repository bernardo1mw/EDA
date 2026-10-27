package infrastructure

import (
	"context"
	"fmt"
	"time"

	"github.com/bernardo1mw/EDA/services/outbox-dispatcher/internal/domain"
	amqp "github.com/rabbitmq/amqp091-go"
)

type amqpPublisher struct {
	channel *amqp.Channel
}

func NewEventPublisher(channel *amqp.Channel) domain.EventPublisher {
	return &amqpPublisher{channel: channel}
}

func (p *amqpPublisher) PublishEvent(ctx context.Context, event *domain.OutboxEvent) error {
	exchange, routingKey := getExchangeAndRoutingKey(event.EventType)
	if exchange == "" {
		return fmt.Errorf("unknown event type: %s", event.EventType)
	}

	return p.channel.Publish(
		exchange,
		routingKey,
		false,
		false,
		amqp.Publishing{
			ContentType: "application/json",
			Body:        []byte(event.EventData),
			Timestamp:   time.Now(),
			MessageId:   event.ID,
			Headers: amqp.Table{
				"event_type":     event.EventType,
				"aggregate_id":   event.AggregateID,
				"aggregate_type": event.AggregateType,
			},
		},
	)
}

func getExchangeAndRoutingKey(eventType string) (string, string) {
	switch eventType {
	case "order.created":
		return "amq.topic", "order.created"
	case "payment.authorized":
		return "amq.topic", "payment.authorized"
	case "payment.declined":
		return "amq.topic", "payment.declined"
	case "inventory.reserved":
		return "amq.topic", "inventory.reserved"
	case "inventory.rejected":
		return "amq.topic", "inventory.rejected"
	case "notification.sent":
		return "amq.topic", "notification.sent"
	default:
		return "", ""
	}
}
