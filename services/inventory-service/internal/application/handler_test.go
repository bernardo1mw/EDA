package application

import (
	"context"
	"errors"
	"testing"

	shared "github.com/bernardo1mw/EDA/services/go-shared/domain"
	"github.com/bernardo1mw/EDA/services/go-shared/testutil"
	"github.com/bernardo1mw/EDA/services/inventory-service/internal/domain"
	"go.opentelemetry.io/otel/trace"
)

// mockInventoryRepository implements domain.InventoryRepository.
type mockInventoryRepository struct {
	CheckAndReserveStockFn func(ctx context.Context, productID string, quantity int) (bool, error)
	StoreInventoryEventFn  func(ctx context.Context, event domain.InventoryEvent) error
	StoredEvents           []domain.InventoryEvent
}

func (m *mockInventoryRepository) CheckAndReserveStock(ctx context.Context, productID string, quantity int) (bool, error) {
	return m.CheckAndReserveStockFn(ctx, productID, quantity)
}

func (m *mockInventoryRepository) StoreInventoryEvent(ctx context.Context, event domain.InventoryEvent) error {
	m.StoredEvents = append(m.StoredEvents, event)
	return m.StoreInventoryEventFn(ctx, event)
}

// mockEventPublisher implements domain.EventPublisher.
type mockEventPublisher struct {
	PublishInventoryEventFn func(ctx context.Context, event domain.InventoryEvent) error
	PublishedEvents         []domain.InventoryEvent
}

func (m *mockEventPublisher) PublishInventoryEvent(ctx context.Context, event domain.InventoryEvent) error {
	m.PublishedEvents = append(m.PublishedEvents, event)
	return m.PublishInventoryEventFn(ctx, event)
}

func newTestHandler(orderRepo domain.OrderRepository, inventoryRepo domain.InventoryRepository, publisher domain.EventPublisher) *Handler {
	tracer := trace.NewNoopTracerProvider().Tracer("test")
	return NewHandler(orderRepo, inventoryRepo, publisher, tracer)
}

func TestProcessPaymentAuthorized_Success(t *testing.T) {
	orderRepo := &testutil.MockOrderRepository{
		GetOrderDetailsFn: func(_ context.Context, orderID string) (*shared.OrderDetails, error) {
			return &shared.OrderDetails{
				ID:          orderID,
				CustomerID:  "cust-1",
				ProductID:   "prod-1",
				Quantity:    2,
				TotalAmount: 100.0,
				Status:      "pending",
			}, nil
		},
	}
	inventoryRepo := &mockInventoryRepository{
		CheckAndReserveStockFn: func(_ context.Context, _ string, _ int) (bool, error) {
			return true, nil
		},
		StoreInventoryEventFn: func(_ context.Context, _ domain.InventoryEvent) error {
			return nil
		},
	}
	publisher := &mockEventPublisher{
		PublishInventoryEventFn: func(_ context.Context, _ domain.InventoryEvent) error {
			return nil
		},
	}

	h := newTestHandler(orderRepo, inventoryRepo, publisher)
	event := domain.PaymentEvent{PaymentID: "pay-1", OrderID: "order-1", Amount: 100.0}

	if err := h.ProcessPaymentAuthorized(context.Background(), event); err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if len(inventoryRepo.StoredEvents) != 1 {
		t.Fatalf("expected 1 stored event, got %d", len(inventoryRepo.StoredEvents))
	}
	if inventoryRepo.StoredEvents[0].Status != "reserved" {
		t.Errorf("expected status %q, got %q", "reserved", inventoryRepo.StoredEvents[0].Status)
	}
	if len(publisher.PublishedEvents) != 1 {
		t.Fatalf("expected 1 published event, got %d", len(publisher.PublishedEvents))
	}
	if publisher.PublishedEvents[0].OrderID != "order-1" {
		t.Errorf("expected order_id %q, got %q", "order-1", publisher.PublishedEvents[0].OrderID)
	}
}

func TestProcessPaymentAuthorized_OrderNotFound(t *testing.T) {
	orderRepo := &testutil.MockOrderRepository{
		GetOrderDetailsFn: func(_ context.Context, _ string) (*shared.OrderDetails, error) {
			return nil, errors.New("order not found")
		},
	}
	// inventoryRepo and publisher are never called when orderRepo fails.
	inventoryRepo := &mockInventoryRepository{}
	publisher := &mockEventPublisher{}

	h := newTestHandler(orderRepo, inventoryRepo, publisher)
	event := domain.PaymentEvent{PaymentID: "pay-2", OrderID: "order-missing"}

	if err := h.ProcessPaymentAuthorized(context.Background(), event); err == nil {
		t.Fatal("expected error for missing order, got nil")
	}
}

func TestProcessPaymentAuthorized_InsufficientStock(t *testing.T) {
	orderRepo := &testutil.MockOrderRepository{
		GetOrderDetailsFn: func(_ context.Context, orderID string) (*shared.OrderDetails, error) {
			return &shared.OrderDetails{
				ID:        orderID,
				ProductID: "prod-low",
				Quantity:  100,
			}, nil
		},
	}
	inventoryRepo := &mockInventoryRepository{
		CheckAndReserveStockFn: func(_ context.Context, _ string, _ int) (bool, error) {
			return false, nil // stock insufficient
		},
		StoreInventoryEventFn: func(_ context.Context, _ domain.InventoryEvent) error {
			return nil
		},
	}
	publisher := &mockEventPublisher{
		PublishInventoryEventFn: func(_ context.Context, _ domain.InventoryEvent) error {
			return nil
		},
	}

	h := newTestHandler(orderRepo, inventoryRepo, publisher)
	event := domain.PaymentEvent{PaymentID: "pay-3", OrderID: "order-3"}

	if err := h.ProcessPaymentAuthorized(context.Background(), event); err != nil {
		t.Fatalf("expected no error for rejected inventory event, got: %v", err)
	}
	if len(inventoryRepo.StoredEvents) != 1 {
		t.Fatalf("expected 1 stored event, got %d", len(inventoryRepo.StoredEvents))
	}
	if inventoryRepo.StoredEvents[0].Status != "rejected" {
		t.Errorf("expected status %q, got %q", "rejected", inventoryRepo.StoredEvents[0].Status)
	}
	if len(publisher.PublishedEvents) != 1 {
		t.Fatalf("expected 1 published event, got %d", len(publisher.PublishedEvents))
	}
}

func TestProcessPaymentAuthorized_PublishFailure(t *testing.T) {
	orderRepo := &testutil.MockOrderRepository{
		GetOrderDetailsFn: func(_ context.Context, orderID string) (*shared.OrderDetails, error) {
			return &shared.OrderDetails{
				ID:        orderID,
				ProductID: "prod-1",
				Quantity:  1,
			}, nil
		},
	}
	inventoryRepo := &mockInventoryRepository{
		CheckAndReserveStockFn: func(_ context.Context, _ string, _ int) (bool, error) {
			return true, nil
		},
		StoreInventoryEventFn: func(_ context.Context, _ domain.InventoryEvent) error {
			return nil
		},
	}
	publisher := &mockEventPublisher{
		PublishInventoryEventFn: func(_ context.Context, _ domain.InventoryEvent) error {
			return errors.New("broker unavailable")
		},
	}

	h := newTestHandler(orderRepo, inventoryRepo, publisher)
	event := domain.PaymentEvent{PaymentID: "pay-4", OrderID: "order-4"}

	if err := h.ProcessPaymentAuthorized(context.Background(), event); err == nil {
		t.Fatal("expected error from publish failure, got nil")
	}
	// Event was stored before publish was attempted.
	if len(inventoryRepo.StoredEvents) != 1 {
		t.Errorf("expected store to be called before publish failure, got %d stored events", len(inventoryRepo.StoredEvents))
	}
}
