package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
	"github.com/streadway/amqp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

// OutboxEvent represents an event in the outbox table
type OutboxEvent struct {
	ID            string     `json:"id"`
	AggregateID   string     `json:"aggregate_id"`
	AggregateType string     `json:"aggregate_type"`
	EventType     string     `json:"event_type"`
	EventData     string     `json:"event_data"`
	CreatedAt     time.Time  `json:"created_at"`
	ProcessedAt   *time.Time `json:"processed_at"`
	Status        string     `json:"status"`
	RetryCount    int        `json:"retry_count"`
	MaxRetries    int        `json:"max_retries"`
}

// OutboxDispatcher handles publishing events from the outbox
type OutboxDispatcher struct {
	db      *sql.DB
	conn    *amqp.Connection
	channel *amqp.Channel
	tracer  trace.Tracer
}

// NewOutboxDispatcher creates a new outbox dispatcher
func NewOutboxDispatcher(db *sql.DB, conn *amqp.Connection) (*OutboxDispatcher, error) {
	channel, err := conn.Channel()
	if err != nil {
		return nil, fmt.Errorf("failed to open channel: %w", err)
	}

	tracer := otel.Tracer("outbox-dispatcher")

	return &OutboxDispatcher{
		db:      db,
		conn:    conn,
		channel: channel,
		tracer:  tracer,
	}, nil
}

// ProcessOutboxEvents processes pending events from the outbox
func (d *OutboxDispatcher) ProcessOutboxEvents(ctx context.Context) error {
	ctx, span := d.tracer.Start(ctx, "process_outbox_events")
	defer span.End()

	// Query for pending events
	query := `
		SELECT id, aggregate_id, aggregate_type, event_type, event_data, 
		       created_at, processed_at, status, retry_count, max_retries
		FROM outbox_events 
		WHERE status = 'PENDING' 
		ORDER BY created_at ASC 
		LIMIT 100
	`

	rows, err := d.db.QueryContext(ctx, query)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to query outbox events")
		return fmt.Errorf("failed to query outbox events: %w", err)
	}
	defer rows.Close()

	processedCount := 0

	for rows.Next() {
		var event OutboxEvent
		err := rows.Scan(
			&event.ID, &event.AggregateID, &event.AggregateType,
			&event.EventType, &event.EventData, &event.CreatedAt,
			&event.ProcessedAt, &event.Status, &event.RetryCount, &event.MaxRetries,
		)
		if err != nil {
			log.Printf("Error scanning outbox event: %v", err)
			continue
		}

		if err := d.processEvent(ctx, &event); err != nil {
			log.Printf("Error processing event %s: %v", event.ID, err)
			continue
		}

		processedCount++
	}

	span.SetAttributes(attribute.Int("processed_events", processedCount))
	span.SetStatus(codes.Ok, "Outbox events processed successfully")

	// Log structured event
	logEvent := map[string]interface{}{
		"timestamp":       time.Now().UTC().Format(time.RFC3339),
		"level":           "info",
		"service":         "outbox-dispatcher",
		"operation":       "process_outbox_events",
		"processed_count": processedCount,
		"trace_id":        span.SpanContext().TraceID().String(),
		"span_id":         span.SpanContext().SpanID().String(),
		"message":         "Outbox events processed successfully",
	}

	logJSON, err := json.Marshal(logEvent)
	if err != nil {
		log.Printf("Error marshaling log event: %v", err)
	} else {
		log.Println(string(logJSON))
	}

	return nil
}

// processEvent processes a single outbox event
func (d *OutboxDispatcher) processEvent(ctx context.Context, event *OutboxEvent) error {
	ctx, span := d.tracer.Start(ctx, "process_event")
	defer span.End()

	span.SetAttributes(
		attribute.String("event.id", event.ID),
		attribute.String("event.type", event.EventType),
		attribute.String("event.aggregate_id", event.AggregateID),
	)

	// Determine exchange and routing key based on event type
	exchange, routingKey := d.getExchangeAndRoutingKey(event.EventType)
	if exchange == "" {
		span.SetStatus(codes.Error, "Unknown event type")
		return fmt.Errorf("unknown event type: %s", event.EventType)
	}

	// Publish message to RabbitMQ
	err := d.channel.Publish(
		exchange,   // exchange
		routingKey, // routing key
		false,      // mandatory
		false,      // immediate
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

	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to publish message")

		// Update retry count
		if err := d.updateRetryCount(ctx, event.ID, event.RetryCount+1); err != nil {
			log.Printf("Error updating retry count: %v", err)
		}

		return fmt.Errorf("failed to publish message: %w", err)
	}

	// Mark event as processed
	if err := d.markEventAsProcessed(ctx, event.ID); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to mark event as processed")
		return fmt.Errorf("failed to mark event as processed: %w", err)
	}

	span.SetStatus(codes.Ok, "Event processed successfully")

	// Log structured event
	logEvent := map[string]interface{}{
		"timestamp":    time.Now().UTC().Format(time.RFC3339),
		"level":        "info",
		"service":      "outbox-dispatcher",
		"operation":    "process_event",
		"event_id":     event.ID,
		"event_type":   event.EventType,
		"aggregate_id": event.AggregateID,
		"exchange":     exchange,
		"routing_key":  routingKey,
		"trace_id":     span.SpanContext().TraceID().String(),
		"span_id":      span.SpanContext().SpanID().String(),
		"message":      "Event processed successfully",
	}

	logJSON, err := json.Marshal(logEvent)
	if err != nil {
		log.Printf("Error marshaling log event: %v", err)
	} else {
		log.Println(string(logJSON))
	}

	return nil
}

// getExchangeAndRoutingKey returns the exchange and routing key for an event type
func (d *OutboxDispatcher) getExchangeAndRoutingKey(eventType string) (string, string) {
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

// updateRetryCount updates the retry count for an event
func (d *OutboxDispatcher) updateRetryCount(ctx context.Context, eventID string, retryCount int) error {
	query := `
		UPDATE outbox_events 
		SET retry_count = $1, status = CASE 
			WHEN retry_count >= max_retries THEN 'FAILED'
			ELSE 'PENDING'
		END
		WHERE id = $2
	`

	_, err := d.db.ExecContext(ctx, query, retryCount, eventID)
	return err
}

// markEventAsProcessed marks an event as processed
func (d *OutboxDispatcher) markEventAsProcessed(ctx context.Context, eventID string) error {
	now := time.Now()
	query := `
		UPDATE outbox_events 
		SET status = 'PROCESSED', processed_at = $1 
		WHERE id = $2
	`

	_, err := d.db.ExecContext(ctx, query, now, eventID)
	return err
}

// Start starts the outbox dispatcher
func (d *OutboxDispatcher) Start(ctx context.Context) error {
	log.Println("Starting Outbox Dispatcher...")

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("Outbox Dispatcher stopped")
			return ctx.Err()
		case <-ticker.C:
			if err := d.ProcessOutboxEvents(ctx); err != nil {
				log.Printf("Error processing outbox events: %v", err)
			}
		}
	}
}

func main() {
	// Load configuration from environment
	dbHost := getEnv("POSTGRES_HOST", "localhost")
	dbPort := getEnv("POSTGRES_PORT", "5432")
	dbUser := getEnv("POSTGRES_USER", "order_user")
	dbPassword := getEnv("POSTGRES_PASSWORD", "order_password")
	dbName := getEnv("POSTGRES_DB", "order_process")

	rabbitmqHost := getEnv("RABBITMQ_HOST", "localhost")
	rabbitmqPort := getEnv("RABBITMQ_PORT", "5672")
	rabbitmqUser := getEnv("RABBITMQ_USER", "order_user")
	rabbitmqPassword := getEnv("RABBITMQ_PASSWORD", "order_password")

	// Connect to database
	dbURL := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Test database connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	// Connect to RabbitMQ
	rabbitmqURL := fmt.Sprintf("amqp://%s:%s@%s:%s/",
		rabbitmqUser, rabbitmqPassword, rabbitmqHost, rabbitmqPort)

	conn, err := amqp.Dial(rabbitmqURL)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer conn.Close()

	// Create outbox dispatcher
	dispatcher, err := NewOutboxDispatcher(db, conn)
	if err != nil {
		log.Fatalf("Failed to create outbox dispatcher: %v", err)
	}

	// Start processing
	ctx := context.Background()
	if err := dispatcher.Start(ctx); err != nil {
		log.Fatalf("Outbox dispatcher failed: %v", err)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
