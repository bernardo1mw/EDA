package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/streadway/amqp"
	_ "github.com/lib/pq"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

// InventoryEvent represents an inventory event
type InventoryEvent struct {
	InventoryID string    `json:"inventory_id"`
	OrderID     string    `json:"order_id"`
	ProductID   string    `json:"product_id"`
	Quantity    int       `json:"quantity"`
	Status      string    `json:"status"`
	ProcessedAt time.Time `json:"processed_at"`
	TraceID     string    `json:"trace_id"`
	SpanID      string    `json:"span_id"`
}

// NotificationEvent represents a notification event
type NotificationEvent struct {
	NotificationID   string    `json:"notification_id"`
	OrderID          string    `json:"order_id"`
	CustomerID       string    `json:"customer_id"`
	NotificationType string    `json:"notification_type"`
	Status           string    `json:"status"`
	SentAt           time.Time `json:"sent_at"`
	TraceID          string    `json:"trace_id"`
	SpanID           string    `json:"span_id"`
}

// NotificationService handles notification processing
type NotificationService struct {
	db      *sql.DB
	conn    *amqp.Connection
	channel *amqp.Channel
	tracer  trace.Tracer
}

// NewNotificationService creates a new notification service
func NewNotificationService(db *sql.DB, conn *amqp.Connection) (*NotificationService, error) {
	channel, err := conn.Channel()
	if err != nil {
		return nil, fmt.Errorf("failed to open channel: %w", err)
	}

	tracer := otel.Tracer("notification-service")
	
	return &NotificationService{
		db:      db,
		conn:    conn,
		channel: channel,
		tracer:  tracer,
	}, nil
}

// ProcessInventoryReserved processes inventory.reserved events
func (s *NotificationService) ProcessInventoryReserved(ctx context.Context, event InventoryEvent) error {
	ctx, span := s.tracer.Start(ctx, "process_inventory_reserved")
	defer span.End()

	span.SetAttributes(
		attribute.String("inventory.id", event.InventoryID),
		attribute.String("order.id", event.OrderID),
		attribute.String("product.id", event.ProductID),
	)

	// Get order details for notification
	order, err := s.getOrderDetails(ctx, event.OrderID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to get order details")
		return fmt.Errorf("failed to get order details: %w", err)
	}

	// Simulate email sending with 98% success rate
	success := true // Simulating high success rate for notifications
	
	var notificationEvent NotificationEvent
	if success {
		notificationEvent = NotificationEvent{
			NotificationID:   fmt.Sprintf("notif_%d", time.Now().UnixNano()),
			OrderID:          event.OrderID,
			CustomerID:       order.CustomerID,
			NotificationType: "order_confirmation",
			Status:           "sent",
			SentAt:           time.Now(),
			TraceID:          event.TraceID,
			SpanID:           event.SpanID,
		}
	} else {
		notificationEvent = NotificationEvent{
			NotificationID:   fmt.Sprintf("notif_%d", time.Now().UnixNano()),
			OrderID:          event.OrderID,
			CustomerID:       order.CustomerID,
			NotificationType: "order_confirmation",
			Status:           "failed",
			SentAt:           time.Now(),
			TraceID:          event.TraceID,
			SpanID:           event.SpanID,
		}
	}

	// Store notification event in database
	if err := s.storeNotificationEvent(ctx, notificationEvent); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to store notification event")
		return fmt.Errorf("failed to store notification event: %w", err)
	}

	// Publish notification event
	if err := s.publishNotificationEvent(ctx, notificationEvent); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to publish notification event")
		return fmt.Errorf("failed to publish notification event: %w", err)
	}

	span.SetAttributes(attribute.String("notification.status", notificationEvent.Status))
	span.SetStatus(codes.Ok, "Notification processed successfully")
	
	// Log structured event
	logEvent := map[string]interface{}{
		"timestamp":         time.Now().UTC().Format(time.RFC3339),
		"level":            "info",
		"service":          "notification-service",
		"operation":        "process_inventory_reserved",
		"order_id":         event.OrderID,
		"inventory_id":     event.InventoryID,
		"notification_id":  notificationEvent.NotificationID,
		"customer_id":      notificationEvent.CustomerID,
		"status":           notificationEvent.Status,
		"trace_id":         event.TraceID,
		"span_id":          event.SpanID,
		"message":          "Notification processed successfully",
	}
	
	logJSON, _ := json.Marshal(logEvent)
	log.Println(string(logJSON))

	return nil
}

// getOrderDetails retrieves order details from the database
func (s *NotificationService) getOrderDetails(ctx context.Context, orderID string) (*OrderDetails, error) {
	query := `
		SELECT id, customer_id, product_id, quantity, total_amount, status
		FROM orders WHERE id = $1
	`
	
	var order OrderDetails
	err := s.db.QueryRowContext(ctx, query, orderID).Scan(
		&order.ID, &order.CustomerID, &order.ProductID,
		&order.Quantity, &order.TotalAmount, &order.Status,
	)
	
	if err != nil {
		return nil, err
	}
	
	return &order, nil
}

// OrderDetails represents order details for notification processing
type OrderDetails struct {
	ID          string  `json:"id"`
	CustomerID  string  `json:"customer_id"`
	ProductID   string  `json:"product_id"`
	Quantity    int     `json:"quantity"`
	TotalAmount float64 `json:"total_amount"`
	Status      string  `json:"status"`
}

// storeNotificationEvent stores a notification event in the database
func (s *NotificationService) storeNotificationEvent(ctx context.Context, event NotificationEvent) error {
	query := `
		INSERT INTO notification_events (id, order_id, customer_id, notification_type, status, sent_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	
	eventID := fmt.Sprintf("evt_%d", time.Now().UnixNano())
	_, err := s.db.ExecContext(ctx, query,
		eventID, event.OrderID, event.CustomerID, event.NotificationType,
		event.Status, event.SentAt, time.Now())
	
	return err
}

// publishNotificationEvent publishes a notification event to RabbitMQ
func (s *NotificationService) publishNotificationEvent(ctx context.Context, event NotificationEvent) error {
	eventData, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal notification event: %w", err)
	}

	exchange := "amq.topic"
	routingKey := "notification.sent"

	err = s.channel.Publish(
		exchange,    // exchange
		routingKey,  // routing key
		false,       // mandatory
		false,       // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			Body:         eventData,
			Timestamp:    time.Now(),
			MessageId:    event.NotificationID,
			Headers: amqp.Table{
				"event_type":      "notification.sent",
				"order_id":        event.OrderID,
				"notification_id": event.NotificationID,
			},
		},
	)
	
	return err
}

// Start starts the notification service consumer
func (s *NotificationService) Start(ctx context.Context) error {
	log.Println("Starting Notification Service...")

	// Declare queue
	queue, err := s.channel.QueueDeclare(
		"inventory.reserved", // name
		true,                 // durable
		false,                // delete when unused
		false,                // exclusive
		false,                // no-wait
		nil,                  // arguments
	)
	if err != nil {
		return fmt.Errorf("failed to declare queue: %w", err)
	}

	// Consume messages
	msgs, err := s.channel.Consume(
		queue.Name, // queue
		"",         // consumer
		false,      // auto-ack
		false,      // exclusive
		false,      // no-local
		false,      // no-wait
		nil,        // args
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
			s.processMessage(ctx, msg)
		}
	}
}

// processMessage processes a single message
func (s *NotificationService) processMessage(ctx context.Context, msg amqp.Delivery) {
	ctx, span := s.tracer.Start(ctx, "process_message")
	defer span.End()

	var event InventoryEvent
	if err := json.Unmarshal(msg.Body, &event); err != nil {
		log.Printf("Error unmarshaling message: %v", err)
		msg.Nack(false, false)
		return
	}

	span.SetAttributes(
		attribute.String("message.id", msg.MessageId),
		attribute.String("inventory.id", event.InventoryID),
	)

	if err := s.ProcessInventoryReserved(ctx, event); err != nil {
		log.Printf("Error processing inventory reserved: %v", err)
		msg.Nack(false, true) // Requeue for retry
		return
	}

	msg.Ack(false)
	span.SetStatus(codes.Ok, "Message processed successfully")
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

	// Create notification service
	notificationService, err := NewNotificationService(db, conn)
	if err != nil {
		log.Fatalf("Failed to create notification service: %v", err)
	}

	// Start processing
	ctx := context.Background()
	if err := notificationService.Start(ctx); err != nil {
		log.Fatalf("Notification service failed: %v", err)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
