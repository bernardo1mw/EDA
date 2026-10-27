package application

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	sharedinfra "github.com/bernardo1mw/EDA/services/go-shared/infra"
	"github.com/bernardo1mw/EDA/services/inventory-service/internal/domain"
	"github.com/google/uuid"
	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

type Handler struct {
	orderRepo     domain.OrderRepository
	inventoryRepo domain.InventoryRepository
	publisher     domain.EventPublisher
	tracer        trace.Tracer
}

func NewHandler(
	orderRepo domain.OrderRepository,
	inventoryRepo domain.InventoryRepository,
	publisher domain.EventPublisher,
	tracer trace.Tracer,
) *Handler {
	return &Handler{
		orderRepo:     orderRepo,
		inventoryRepo: inventoryRepo,
		publisher:     publisher,
		tracer:        tracer,
	}
}

func (h *Handler) ProcessPaymentAuthorized(ctx context.Context, event domain.PaymentEvent) error {
	timer := prometheus.NewTimer(sharedinfra.MessageProcessingDuration.WithLabelValues("inventory-service"))
	defer timer.ObserveDuration()

	ctx, span := h.tracer.Start(ctx, "process_payment_authorized")
	defer span.End()

	span.SetAttributes(
		attribute.String("payment.id", event.PaymentID),
		attribute.String("order.id", event.OrderID),
		attribute.Float64("payment.amount", event.Amount),
	)

	order, err := h.orderRepo.GetOrderDetails(ctx, event.OrderID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to get order details")
		return fmt.Errorf("failed to get order details: %w", err)
	}

	success, err := h.inventoryRepo.CheckAndReserveStock(ctx, order.ProductID, order.Quantity)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to check stock")
		return fmt.Errorf("failed to check stock: %w", err)
	}

	status := "reserved"
	if !success {
		status = "rejected"
	}

	inventoryEvent := domain.InventoryEvent{
		InventoryID: uuid.New().String(),
		OrderID:     event.OrderID,
		ProductID:   order.ProductID,
		Quantity:    order.Quantity,
		Status:      status,
		ProcessedAt: time.Now(),
		TraceID:     event.TraceID,
		SpanID:      event.SpanID,
	}

	if err := h.inventoryRepo.StoreInventoryEvent(ctx, inventoryEvent); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to store inventory event")
		return fmt.Errorf("failed to store inventory event: %w", err)
	}

	if err := h.publisher.PublishInventoryEvent(ctx, inventoryEvent); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to publish inventory event")
		return fmt.Errorf("failed to publish inventory event: %w", err)
	}

	sharedinfra.MessagesProcessed.WithLabelValues("inventory-service", inventoryEvent.Status).Inc()

	span.SetAttributes(attribute.String("inventory.status", inventoryEvent.Status))
	span.SetStatus(codes.Ok, "Inventory processed successfully")

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
