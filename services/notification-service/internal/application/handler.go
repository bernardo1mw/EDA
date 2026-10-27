package application

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"time"

	sharedinfra "github.com/bernardo1mw/EDA/services/go-shared/infra"
	"github.com/bernardo1mw/EDA/services/notification-service/internal/domain"
	"github.com/google/uuid"
	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

type Handler struct {
	orderRepo        domain.OrderRepository
	notificationRepo domain.NotificationRepository
	publisher        domain.EventPublisher
	tracer           trace.Tracer
}

func NewHandler(
	orderRepo domain.OrderRepository,
	notificationRepo domain.NotificationRepository,
	publisher domain.EventPublisher,
	tracer trace.Tracer,
) *Handler {
	return &Handler{
		orderRepo:        orderRepo,
		notificationRepo: notificationRepo,
		publisher:        publisher,
		tracer:           tracer,
	}
}

func (h *Handler) ProcessInventoryReserved(ctx context.Context, event domain.InventoryEvent) error {
	timer := prometheus.NewTimer(sharedinfra.MessageProcessingDuration.WithLabelValues("notification-service"))
	defer timer.ObserveDuration()

	ctx, span := h.tracer.Start(ctx, "process_inventory_reserved")
	defer span.End()

	span.SetAttributes(
		attribute.String("inventory.id", event.InventoryID),
		attribute.String("order.id", event.OrderID),
		attribute.String("product.id", event.ProductID),
	)

	order, err := h.orderRepo.GetOrderDetails(ctx, event.OrderID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to get order details")
		return fmt.Errorf("failed to get order details: %w", err)
	}

	success := rand.Float64() < 0.98

	status := "sent"
	if !success {
		status = "failed"
	}

	notificationEvent := domain.NotificationEvent{
		NotificationID:   uuid.New().String(),
		OrderID:          event.OrderID,
		CustomerID:       order.CustomerID,
		NotificationType: "order_confirmation",
		Status:           status,
		SentAt:           time.Now(),
		TraceID:          event.TraceID,
		SpanID:           event.SpanID,
	}

	if err := h.notificationRepo.StoreNotificationEvent(ctx, notificationEvent); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to store notification event")
		return fmt.Errorf("failed to store notification event: %w", err)
	}

	if err := h.publisher.PublishNotificationEvent(ctx, notificationEvent); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to publish notification event")
		return fmt.Errorf("failed to publish notification event: %w", err)
	}

	sharedinfra.MessagesProcessed.WithLabelValues("notification-service", notificationEvent.Status).Inc()

	span.SetAttributes(attribute.String("notification.status", notificationEvent.Status))
	span.SetStatus(codes.Ok, "Notification processed successfully")

	logEvent := map[string]interface{}{
		"timestamp":        time.Now().UTC().Format(time.RFC3339),
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
