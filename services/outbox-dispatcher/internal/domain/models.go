package domain

import "time"

type OutboxEvent struct {
	ID            string     `json:"id"`
	AggregateID   string     `json:"aggregate_id"`
	AggregateType string     `json:"aggregate_type"`
	EventType     string     `json:"event_type"`
	EventData     string     `json:"event_data"`
	CreatedAt     time.Time  `json:"created_at"`
	ProcessedAt   *time.Time `json:"processed_at"`
	Status        string     `json:"status"`
	RetryCount    int        `json:"retry_count"`
	MaxRetries    int        `json:"max_retries"`
}
