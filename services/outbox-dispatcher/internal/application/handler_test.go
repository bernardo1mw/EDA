package application

import (
	"context"
	"errors"
	"testing"

	"github.com/bernardo1mw/EDA/services/outbox-dispatcher/internal/domain"
	"go.opentelemetry.io/otel/trace"
)

// mockOutboxRepository implements domain.OutboxRepository.
type mockOutboxRepository struct {
	GetPendingEventsFn     func(ctx context.Context) ([]domain.OutboxEvent, error)
	MarkEventAsProcessedFn func(ctx context.Context, eventID string) error
	UpdateRetryCountFn     func(ctx context.Context, eventID string, retryCount int) error
	MarkedProcessed        []string
	UpdatedRetryIDs        []string
	UpdatedRetryCounts     []int
}

func (m *mockOutboxRepository) GetPendingEvents(ctx context.Context) ([]domain.OutboxEvent, error) {
	return m.GetPendingEventsFn(ctx)
}

func (m *mockOutboxRepository) MarkEventAsProcessed(ctx context.Context, eventID string) error {
	m.MarkedProcessed = append(m.MarkedProcessed, eventID)
	return m.MarkEventAsProcessedFn(ctx, eventID)
}

func (m *mockOutboxRepository) UpdateRetryCount(ctx context.Context, eventID string, retryCount int) error {
	m.UpdatedRetryIDs = append(m.UpdatedRetryIDs, eventID)
	m.UpdatedRetryCounts = append(m.UpdatedRetryCounts, retryCount)
	return m.UpdateRetryCountFn(ctx, eventID, retryCount)
}

// mockEventPublisher implements domain.EventPublisher.
type mockEventPublisher struct {
	PublishEventFn  func(ctx context.Context, event *domain.OutboxEvent) error
	PublishedEvents []*domain.OutboxEvent
}

func (m *mockEventPublisher) PublishEvent(ctx context.Context, event *domain.OutboxEvent) error {
	m.PublishedEvents = append(m.PublishedEvents, event)
	return m.PublishEventFn(ctx, event)
}

func newTestHandler(repo domain.OutboxRepository, publisher domain.EventPublisher) *Handler {
	tracer := trace.NewNoopTracerProvider().Tracer("test")
	return NewHandler(repo, publisher, tracer)
}

func TestProcessOutboxEvents_Success(t *testing.T) {
	events := []domain.OutboxEvent{
		{ID: "evt-1", EventType: "order.created", AggregateID: "order-1"},
		{ID: "evt-2", EventType: "order.updated", AggregateID: "order-2"},
	}
	repo := &mockOutboxRepository{
		GetPendingEventsFn: func(_ context.Context) ([]domain.OutboxEvent, error) {
			return events, nil
		},
		MarkEventAsProcessedFn: func(_ context.Context, _ string) error {
			return nil
		},
		UpdateRetryCountFn: func(_ context.Context, _ string, _ int) error {
			return nil
		},
	}
	publisher := &mockEventPublisher{
		PublishEventFn: func(_ context.Context, _ *domain.OutboxEvent) error {
			return nil
		},
	}

	h := newTestHandler(repo, publisher)
	if err := h.ProcessOutboxEvents(context.Background()); err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if len(repo.MarkedProcessed) != 2 {
		t.Errorf("expected 2 events marked processed, got %d", len(repo.MarkedProcessed))
	}
	if len(publisher.PublishedEvents) != 2 {
		t.Errorf("expected 2 published events, got %d", len(publisher.PublishedEvents))
	}
}

func TestProcessEvent_Success(t *testing.T) {
	repo := &mockOutboxRepository{
		GetPendingEventsFn: func(_ context.Context) ([]domain.OutboxEvent, error) {
			return nil, nil
		},
		MarkEventAsProcessedFn: func(_ context.Context, _ string) error {
			return nil
		},
		UpdateRetryCountFn: func(_ context.Context, _ string, _ int) error {
			return nil
		},
	}
	publisher := &mockEventPublisher{
		PublishEventFn: func(_ context.Context, _ *domain.OutboxEvent) error {
			return nil
		},
	}

	h := newTestHandler(repo, publisher)
	event := &domain.OutboxEvent{ID: "evt-1", EventType: "order.created", AggregateID: "order-1"}

	if err := h.processEvent(context.Background(), event); err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if len(repo.MarkedProcessed) != 1 || repo.MarkedProcessed[0] != "evt-1" {
		t.Errorf("expected event %q marked as processed, got %v", "evt-1", repo.MarkedProcessed)
	}
}

func TestProcessEvent_PublishFailure(t *testing.T) {
	repo := &mockOutboxRepository{
		GetPendingEventsFn: func(_ context.Context) ([]domain.OutboxEvent, error) {
			return nil, nil
		},
		MarkEventAsProcessedFn: func(_ context.Context, _ string) error {
			return nil
		},
		UpdateRetryCountFn: func(_ context.Context, _ string, _ int) error {
			return nil
		},
	}
	publisher := &mockEventPublisher{
		PublishEventFn: func(_ context.Context, _ *domain.OutboxEvent) error {
			return errors.New("broker unavailable")
		},
	}

	h := newTestHandler(repo, publisher)
	event := &domain.OutboxEvent{ID: "evt-2", EventType: "order.created", RetryCount: 0}

	if err := h.processEvent(context.Background(), event); err == nil {
		t.Fatal("expected error from publish failure, got nil")
	}
	// Retry count must be incremented.
	if len(repo.UpdatedRetryIDs) != 1 {
		t.Fatalf("expected UpdateRetryCount to be called once, got %d", len(repo.UpdatedRetryIDs))
	}
	if repo.UpdatedRetryIDs[0] != "evt-2" {
		t.Errorf("expected retry update for %q, got %q", "evt-2", repo.UpdatedRetryIDs[0])
	}
	if repo.UpdatedRetryCounts[0] != 1 {
		t.Errorf("expected retry count 1, got %d", repo.UpdatedRetryCounts[0])
	}
	// Event must NOT be marked as processed.
	if len(repo.MarkedProcessed) != 0 {
		t.Errorf("expected no mark-processed calls, got %d", len(repo.MarkedProcessed))
	}
}

// TestProcessEvent_MaxRetriesExceeded verifies the current behavior when an event
// has reached MaxRetries: the handler still calls UpdateRetryCount (it does not yet
// transition the event to a "failed" status — that logic is not implemented in the
// handler and would need to be added in future work).
func TestProcessEvent_MaxRetriesExceeded(t *testing.T) {
	repo := &mockOutboxRepository{
		GetPendingEventsFn: func(_ context.Context) ([]domain.OutboxEvent, error) {
			return nil, nil
		},
		MarkEventAsProcessedFn: func(_ context.Context, _ string) error {
			return nil
		},
		UpdateRetryCountFn: func(_ context.Context, _ string, _ int) error {
			return nil
		},
	}
	publisher := &mockEventPublisher{
		PublishEventFn: func(_ context.Context, _ *domain.OutboxEvent) error {
			return errors.New("broker unavailable")
		},
	}

	h := newTestHandler(repo, publisher)
	event := &domain.OutboxEvent{
		ID:         "evt-3",
		EventType:  "order.created",
		RetryCount: 5,
		MaxRetries: 5,
	}

	if err := h.processEvent(context.Background(), event); err == nil {
		t.Fatal("expected error when publish fails at max retries, got nil")
	}
	if len(repo.UpdatedRetryIDs) != 1 || repo.UpdatedRetryCounts[0] != 6 {
		t.Errorf("expected retry count incremented to 6, got updates: ids=%v counts=%v",
			repo.UpdatedRetryIDs, repo.UpdatedRetryCounts)
	}
}
