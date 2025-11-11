package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"github.com/streadway/amqp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

// PaymentEvent represents a payment event
// Note: Using camelCase to match payment-service-nestjs DTO format
type PaymentEvent struct {
	PaymentID   string    `json:"paymentId"`
	OrderID     string    `json:"orderId"`
	Amount      float64   `json:"amount"`
	Status      string    `json:"status"`
	ProcessedAt time.Time `json:"processedAt"`
	TraceID     string    `json:"traceId,omitempty"`
	SpanID      string    `json:"spanId,omitempty"`
}

// paymentEventJSON is used for unmarshaling JSON with string dates
type paymentEventJSON struct {
	PaymentID   string  `json:"paymentId"`
	OrderID     string  `json:"orderId"`
	Amount      float64 `json:"amount"`
	Status      string  `json:"status"`
	ProcessedAt string  `json:"processedAt"`
	TraceID     string  `json:"traceId,omitempty"`
	SpanID      string  `json:"spanId,omitempty"`
}

// UnmarshalJSON custom unmarshaler for PaymentEvent to handle ISO date strings
func (e *PaymentEvent) UnmarshalJSON(data []byte) error {
	var j paymentEventJSON
	if err := json.Unmarshal(data, &j); err != nil {
		return err
	}

	e.PaymentID = j.PaymentID
	e.OrderID = j.OrderID
	e.Amount = j.Amount
	e.Status = j.Status
	e.TraceID = j.TraceID
	e.SpanID = j.SpanID

	// Parse ISO 8601 date string
	if j.ProcessedAt != "" {
		parsedTime, err := time.Parse(time.RFC3339, j.ProcessedAt)
		if err != nil {
			// If parsing fails, use zero time
			e.ProcessedAt = time.Time{}
		} else {
			e.ProcessedAt = parsedTime
		}
	} else {
		e.ProcessedAt = time.Time{}
	}

	return nil
}

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

// InventoryService handles inventory operations
type InventoryService struct {
	db      *sql.DB
	conn    *amqp.Connection
	channel *amqp.Channel
	tracer  trace.Tracer
}

// NewInventoryService creates a new inventory service
func NewInventoryService(db *sql.DB, conn *amqp.Connection) (*InventoryService, error) {
	channel, err := conn.Channel()
	if err != nil {
		return nil, fmt.Errorf("failed to open channel: %w", err)
	}

	tracer := otel.Tracer("inventory-service")

	return &InventoryService{
		db:      db,
		conn:    conn,
		channel: channel,
		tracer:  tracer,
	}, nil
}

// ProcessPaymentAuthorized processes payment.authorized events
func (s *InventoryService) ProcessPaymentAuthorized(ctx context.Context, event PaymentEvent) error {
	ctx, span := s.tracer.Start(ctx, "process_payment_authorized")
	defer span.End()

	span.SetAttributes(
		attribute.String("payment.id", event.PaymentID),
		attribute.String("order.id", event.OrderID),
		attribute.Float64("payment.amount", event.Amount),
	)

	// Get order details from database
	order, err := s.getOrderDetails(ctx, event.OrderID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to get order details")
		return fmt.Errorf("failed to get order details: %w", err)
	}

	// Check and reserve stock in database
	success, err := s.checkAndReserveStock(ctx, order.ProductID, order.Quantity)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to check stock")
		return fmt.Errorf("failed to check stock: %w", err)
	}

	var inventoryEvent InventoryEvent
	if success {
		inventoryEvent = InventoryEvent{
			InventoryID: fmt.Sprintf("inv_%d", time.Now().UnixNano()),
			OrderID:     event.OrderID,
			ProductID:   order.ProductID,
			Quantity:    order.Quantity,
			Status:      "reserved",
			ProcessedAt: time.Now(),
			TraceID:     event.TraceID,
			SpanID:      event.SpanID,
		}
	} else {
		inventoryEvent = InventoryEvent{
			InventoryID: fmt.Sprintf("inv_%d", time.Now().UnixNano()),
			OrderID:     event.OrderID,
			ProductID:   order.ProductID,
			Quantity:    order.Quantity,
			Status:      "rejected",
			ProcessedAt: time.Now(),
			TraceID:     event.TraceID,
			SpanID:      event.SpanID,
		}
	}

	// Store inventory event in database
	if err := s.storeInventoryEvent(ctx, inventoryEvent); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to store inventory event")
		return fmt.Errorf("failed to store inventory event: %w", err)
	}

	// Publish inventory event
	if err := s.publishInventoryEvent(ctx, inventoryEvent); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to publish inventory event")
		return fmt.Errorf("failed to publish inventory event: %w", err)
	}

	span.SetAttributes(attribute.String("inventory.status", inventoryEvent.Status))
	span.SetStatus(codes.Ok, "Inventory processed successfully")

	// Log structured event
	logEvent := map[string]interface{}{
		"timestamp":    time.Now().UTC().Format(time.RFC3339),
		"level":        "info",
		"service":      "inventory-service",
		"operation":    "process_payment_authorized",
		"order_id":     event.OrderID,
		"payment_id":   event.PaymentID,
		"inventory_id": inventoryEvent.InventoryID,
		"product_id":   inventoryEvent.ProductID,
		"quantity":     inventoryEvent.Quantity,
		"status":       inventoryEvent.Status,
		"trace_id":     event.TraceID,
		"span_id":      event.SpanID,
		"message":      "Inventory processed successfully",
	}

	logJSON, _ := json.Marshal(logEvent)
	log.Println(string(logJSON))

	return nil
}

// getOrderDetails retrieves order details from the database
func (s *InventoryService) getOrderDetails(ctx context.Context, orderID string) (*OrderDetails, error) {
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

// OrderDetails represents order details for inventory processing
type OrderDetails struct {
	ID          string  `json:"id"`
	CustomerID  string  `json:"customer_id"`
	ProductID   string  `json:"product_id"`
	Quantity    int     `json:"quantity"`
	TotalAmount float64 `json:"total_amount"`
	Status      string  `json:"status"`
}

// checkAndReserveStock checks if product has enough stock and reserves it
func (s *InventoryService) checkAndReserveStock(ctx context.Context, productID string, quantity int) (bool, error) {
	// Check current stock
	checkQuery := `
		SELECT stock_quantity 
		FROM products 
		WHERE id = $1
	`

	var currentStock int
	err := s.db.QueryRowContext(ctx, checkQuery, productID).Scan(&currentStock)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, fmt.Errorf("product not found: %s", productID)
		}
		return false, err
	}

	// Check if enough stock available
	if currentStock < quantity {
		return false, nil
	}

	// Reserve stock (decrease stock_quantity)
	reserveQuery := `
		UPDATE products 
		SET stock_quantity = stock_quantity - $2, updated_at = NOW()
		WHERE id = $1 AND stock_quantity >= $2
		RETURNING stock_quantity
	`

	var newStock int
	err = s.db.QueryRowContext(ctx, reserveQuery, productID, quantity).Scan(&newStock)
	if err != nil {
		if err == sql.ErrNoRows {
			// Stock was insufficient or changed between check and update
			return false, nil
		}
		return false, err
	}

	return true, nil
}

// storeInventoryEvent stores an inventory event in the database
func (s *InventoryService) storeInventoryEvent(ctx context.Context, event InventoryEvent) error {
	query := `
		INSERT INTO inventory_events (id, order_id, product_id, quantity, status, processed_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	eventID := uuid.New().String()
	_, err := s.db.ExecContext(ctx, query,
		eventID, event.OrderID, event.ProductID, event.Quantity,
		event.Status, event.ProcessedAt, time.Now())

	return err
}

// publishInventoryEvent publishes an inventory event to RabbitMQ
func (s *InventoryService) publishInventoryEvent(ctx context.Context, event InventoryEvent) error {
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

	err = s.channel.Publish(
		exchange,   // exchange
		routingKey, // routing key
		false,      // mandatory
		false,      // immediate
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

	return err
}

// Start starts the inventory service consumer
func (s *InventoryService) Start(ctx context.Context) error {
	log.Println("Starting Inventory Service...")

	// Declare exchange
	log.Println("Declaring exchange: amq.topic")
	err := s.channel.ExchangeDeclare(
		"amq.topic", // name
		"topic",     // type
		true,        // durable
		false,       // auto-deleted
		false,       // internal
		false,       // no-wait
		nil,         // arguments
	)
	if err != nil {
		log.Printf("Failed to declare exchange: %v", err)
		return fmt.Errorf("failed to declare exchange: %w", err)
	}
	log.Printf("Exchange declared successfully: amq.topic")

	// Declare queue
	log.Println("Declaring queue: payment.authorized")
	queue, err := s.channel.QueueDeclare(
		"payment.authorized", // name
		true,                 // durable
		false,                // delete when unused
		false,                // exclusive
		false,                // no-wait
		nil,                  // arguments
	)
	if err != nil {
		log.Printf("Failed to declare queue: %v", err)
		return fmt.Errorf("failed to declare queue: %w", err)
	}
	log.Printf("Queue declared successfully: %s", queue.Name)

	// Bind queue to exchange
	log.Println("Binding queue to exchange with routing key: payment.authorized")
	err = s.channel.QueueBind(
		queue.Name,           // queue name
		"payment.authorized", // routing key
		"amq.topic",          // exchange
		false,                // no-wait
		nil,                  // arguments
	)
	if err != nil {
		log.Printf("Failed to bind queue: %v", err)
		return fmt.Errorf("failed to bind queue: %w", err)
	}
	log.Printf("Queue bound successfully to exchange amq.topic")

	// Consume messages
	log.Println("Starting to consume messages from queue:", queue.Name)
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
			s.processMessage(ctx, msg)
		}
	}
}

// processMessage processes a single message
func (s *InventoryService) processMessage(ctx context.Context, msg amqp.Delivery) {
	ctx, span := s.tracer.Start(ctx, "process_message")
	defer span.End()

	var event PaymentEvent
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

	if err := s.ProcessPaymentAuthorized(ctx, event); err != nil {
		log.Printf("Error processing payment authorized: %v", err)
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

	// Create inventory service
	inventoryService, err := NewInventoryService(db, conn)
	if err != nil {
		log.Fatalf("Failed to create inventory service: %v", err)
	}

	// Start processing
	ctx := context.Background()
	if err := inventoryService.Start(ctx); err != nil {
		log.Fatalf("Inventory service failed: %v", err)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
