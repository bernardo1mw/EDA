package domain

import "time"

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

type NotificationEvent struct {
	NotificationID   string    `json:"notification_id"`
	OrderID          string    `json:"order_id"`
	CustomerID       string    `json:"customer_id"`
	NotificationType string    `json:"notification_type"`
	Status           string    `json:"status"`
	SentAt           time.Time `json:"sent_at"`
	TraceID          string    `json:"trace_id"`
	SpanID           string    `json:"span_id"`
}
