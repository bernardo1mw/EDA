package application

import (
	"context"
	"errors"
	"testing"

	shared "github.com/bernardo1mw/EDA/services/go-shared/domain"
	"github.com/bernardo1mw/EDA/services/go-shared/testutil"
	"github.com/bernardo1mw/EDA/services/notification-service/internal/domain"
	"go.opentelemetry.io/otel/trace"
)

// mockNotificationRepository implements domain.NotificationRepository.
type mockNotificationRepository struct {
	StoreNotificationEventFn func(ctx context.Context, event domain.NotificationEvent) error
	StoredEvents             []domain.NotificationEvent
}

func (m *mockNotificationRepository) StoreNotificationEvent(ctx context.Context, event domain.NotificationEvent) error {
	m.StoredEvents = append(m.StoredEvents, event)
	return m.StoreNotificationEventFn(ctx, event)
}

// mockEventPublisher implements domain.EventPublisher.
type mockEventPublisher struct {
	PublishNotificationEventFn func(ctx context.Context, event domain.NotificationEvent) error
	PublishedEvents            []domain.NotificationEvent
}

func (m *mockEventPublisher) PublishNotificationEvent(ctx context.Context, event domain.NotificationEvent) error {
	m.PublishedEvents = append(m.PublishedEvents, event)
	return m.PublishNotificationEventFn(ctx, event)
}

func newTestHandler(orderRepo domain.OrderRepository, notifRepo domain.NotificationRepository, publisher domain.EventPublisher) *Handler {
	tracer := trace.NewNoopTracerProvider().Tracer("test")
	return NewHandler(orderRepo, notifRepo, publisher, tracer)
}

func TestProcessInventoryReserved_Success(t *testing.T) {
	orderRepo := &testutil.MockOrderRepository{
		GetOrderDetailsFn: func(_ context.Context, orderID string) (*shared.OrderDetails, error) {
			return &shared.OrderDetails{
				ID:         orderID,
				CustomerID: "cust-1",
				ProductID:  "prod-1",
				Quantity:   2,
			}, nil
		},
	}
	notifRepo := &mockNotificationRepository{
		StoreNotificationEventFn: func(_ context.Context, _ domain.NotificationEvent) error {
			return nil
		},
	}
	publisher := &mockEventPublisher{
		PublishNotificationEventFn: func(_ context.Context, _ domain.NotificationEvent) error {
			return nil
		},
	}

	h := newTestHandler(orderRepo, notifRepo, publisher)
	event := domain.InventoryEvent{InventoryID: "inv-1", OrderID: "order-1", ProductID: "prod-1", Quantity: 2, Status: "reserved"}

	if err := h.ProcessInventoryReserved(context.Background(), event); err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if len(notifRepo.StoredEvents) != 1 {
		t.Fatalf("expected 1 stored notification, got %d", len(notifRepo.StoredEvents))
	}
	status := notifRepo.StoredEvents[0].Status
	if status != "sent" && status != "failed" {
		t.Errorf("expected status %q or %q, got %q", "sent", "failed", status)
	}
	if notifRepo.StoredEvents[0].CustomerID != "cust-1" {
		t.Errorf("expected customer_id %q, got %q", "cust-1", notifRepo.StoredEvents[0].CustomerID)
	}
	if len(publisher.PublishedEvents) != 1 {
		t.Fatalf("expected 1 published notification, got %d", len(publisher.PublishedEvents))
	}
}

func TestProcessInventoryReserved_OrderNotFound(t *testing.T) {
	orderRepo := &testutil.MockOrderRepository{
		GetOrderDetailsFn: func(_ context.Context, _ string) (*shared.OrderDetails, error) {
			return nil, errors.New("order not found")
		},
	}
	notifRepo := &mockNotificationRepository{}
	publisher := &mockEventPublisher{}

	h := newTestHandler(orderRepo, notifRepo, publisher)
	event := domain.InventoryEvent{InventoryID: "inv-2", OrderID: "order-missing"}

	if err := h.ProcessInventoryReserved(context.Background(), event); err == nil {
		t.Fatal("expected error for missing order, got nil")
	}
}

func TestProcessInventoryReserved_StoreFailure(t *testing.T) {
	orderRepo := &testutil.MockOrderRepository{
		GetOrderDetailsFn: func(_ context.Context, orderID string) (*shared.OrderDetails, error) {
			return &shared.OrderDetails{ID: orderID, CustomerID: "cust-2"}, nil
		},
	}
	notifRepo := &mockNotificationRepository{
		StoreNotificationEventFn: func(_ context.Context, _ domain.NotificationEvent) error {
			return errors.New("db write failed")
		},
	}
	publisher := &mockEventPublisher{}

	h := newTestHandler(orderRepo, notifRepo, publisher)
	event := domain.InventoryEvent{InventoryID: "inv-3", OrderID: "order-3"}

	if err := h.ProcessInventoryReserved(context.Background(), event); err == nil {
		t.Fatal("expected error from store failure, got nil")
	}
	if len(publisher.PublishedEvents) != 0 {
		t.Errorf("expected no publish after store failure, got %d", len(publisher.PublishedEvents))
	}
}

func TestProcessInventoryReserved_PublishFailure(t *testing.T) {
	orderRepo := &testutil.MockOrderRepository{
		GetOrderDetailsFn: func(_ context.Context, orderID string) (*shared.OrderDetails, error) {
			return &shared.OrderDetails{ID: orderID, CustomerID: "cust-3"}, nil
		},
	}
	notifRepo := &mockNotificationRepository{
		StoreNotificationEventFn: func(_ context.Context, _ domain.NotificationEvent) error {
			return nil
		},
	}
	publisher := &mockEventPublisher{
		PublishNotificationEventFn: func(_ context.Context, _ domain.NotificationEvent) error {
			return errors.New("broker unavailable")
		},
	}

	h := newTestHandler(orderRepo, notifRepo, publisher)
	event := domain.InventoryEvent{InventoryID: "inv-4", OrderID: "order-4"}

	if err := h.ProcessInventoryReserved(context.Background(), event); err == nil {
		t.Fatal("expected error from publish failure, got nil")
	}
	// Store was called before publish was attempted.
	if len(notifRepo.StoredEvents) != 1 {
		t.Errorf("expected store to be called before publish failure, got %d stored events", len(notifRepo.StoredEvents))
	}
}
