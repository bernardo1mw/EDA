package application

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	sharedinfra "github.com/bernardo1mw/EDA/services/go-shared/infra"
	"github.com/bernardo1mw/EDA/services/outbox-dispatcher/internal/domain"
	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

type Handler struct {
	outboxRepo domain.OutboxRepository
	publisher  domain.EventPublisher
	tracer     trace.Tracer
}

func NewHandler(outboxRepo domain.OutboxRepository, publisher domain.EventPublisher, tracer trace.Tracer) *Handler {
	return &Handler{outboxRepo: outboxRepo, publisher: publisher, tracer: tracer}
}

func (h *Handler) ProcessOutboxEvents(ctx context.Context) error {
	timer := prometheus.NewTimer(sharedinfra.MessageProcessingDuration.WithLabelValues("outbox-dispatcher"))
	defer timer.ObserveDuration()

	ctx, span := h.tracer.Start(ctx, "process_outbox_events")
	defer span.End()

	events, err := h.outboxRepo.GetPendingEvents(ctx)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to query outbox events")
		return fmt.Errorf("failed to query outbox events: %w", err)
	}

	processedCount := 0

	for i := range events {
		if err := h.processEvent(ctx, &events[i]); err != nil {
			log.Printf("Error processing event %s: %v", events[i].ID, err)
			continue
		}
		processedCount++
	}

	span.SetAttributes(attribute.Int("processed_events", processedCount))
	span.SetStatus(codes.Ok, "Outbox events processed successfully")

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

func (h *Handler) processEvent(ctx context.Context, event *domain.OutboxEvent) error {
	ctx, span := h.tracer.Start(ctx, "process_event")
	defer span.End()

	span.SetAttributes(
		attribute.String("event.id", event.ID),
		attribute.String("event.type", event.EventType),
		attribute.String("event.aggregate_id", event.AggregateID),
	)

	if err := h.publisher.PublishEvent(ctx, event); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to publish message")
		sharedinfra.MessagesProcessed.WithLabelValues("outbox-dispatcher", "error").Inc()

		if err := h.outboxRepo.UpdateRetryCount(ctx, event.ID, event.RetryCount+1); err != nil {
			log.Printf("Error updating retry count: %v", err)
		}

		return fmt.Errorf("failed to publish message: %w", err)
	}

	if err := h.outboxRepo.MarkEventAsProcessed(ctx, event.ID); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to mark event as processed")
		return fmt.Errorf("failed to mark event as processed: %w", err)
	}

	sharedinfra.MessagesProcessed.WithLabelValues("outbox-dispatcher", "success").Inc()
	span.SetStatus(codes.Ok, "Event processed successfully")

	logEvent := map[string]interface{}{
		"timestamp":    time.Now().UTC().Format(time.RFC3339),
		"level":        "info",
		"service":      "outbox-dispatcher",
		"operation":    "process_event",
		"event_id":     event.ID,
		"event_type":   event.EventType,
		"aggregate_id": event.AggregateID,
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
