package domain

import "context"

type OutboxRepository interface {
	GetPendingEvents(ctx context.Context) ([]OutboxEvent, error)
	MarkEventAsProcessed(ctx context.Context, eventID string) error
	UpdateRetryCount(ctx context.Context, eventID string, retryCount int) error
}

type EventPublisher interface {
	PublishEvent(ctx context.Context, event *OutboxEvent) error
}
