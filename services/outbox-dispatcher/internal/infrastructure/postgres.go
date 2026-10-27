package infrastructure

import (
	"context"
	"database/sql"
	"log"
	"time"

	"github.com/bernardo1mw/EDA/services/outbox-dispatcher/internal/domain"
)

type postgresOutboxRepo struct {
	db *sql.DB
}

func NewOutboxRepository(db *sql.DB) domain.OutboxRepository {
	return &postgresOutboxRepo{db: db}
}

func (r *postgresOutboxRepo) GetPendingEvents(ctx context.Context) ([]domain.OutboxEvent, error) {
	query := `
		SELECT id, aggregate_id, aggregate_type, event_type, event_data,
		       created_at, processed_at, status, retry_count, max_retries
		FROM outbox_events
		WHERE status = 'PENDING'
		ORDER BY created_at ASC
		LIMIT 100
		FOR UPDATE SKIP LOCKED
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []domain.OutboxEvent
	for rows.Next() {
		var event domain.OutboxEvent
		if err := rows.Scan(
			&event.ID, &event.AggregateID, &event.AggregateType,
			&event.EventType, &event.EventData, &event.CreatedAt,
			&event.ProcessedAt, &event.Status, &event.RetryCount, &event.MaxRetries,
		); err != nil {
			log.Printf("Error scanning outbox event: %v", err)
			continue
		}
		events = append(events, event)
	}

	return events, nil
}

func (r *postgresOutboxRepo) MarkEventAsProcessed(ctx context.Context, eventID string) error {
	now := time.Now()
	query := `
		UPDATE outbox_events
		SET status = 'PROCESSED', processed_at = $1
		WHERE id = $2
	`

	_, err := r.db.ExecContext(ctx, query, now, eventID)
	return err
}

func (r *postgresOutboxRepo) UpdateRetryCount(ctx context.Context, eventID string, retryCount int) error {
	query := `
		UPDATE outbox_events
		SET retry_count = $1, status = CASE
			WHEN retry_count >= max_retries THEN 'FAILED'
			ELSE 'PENDING'
		END
		WHERE id = $2
	`

	_, err := r.db.ExecContext(ctx, query, retryCount, eventID)
	return err
}
