package domain

import (
	"encoding/json"
	"fmt"
	"time"
)

// PaymentEvent uses camelCase to match payment-service-nestjs DTO format.
type PaymentEvent struct {
	PaymentID   string    `json:"paymentId"`
	OrderID     string    `json:"orderId"`
	Amount      float64   `json:"amount"`
	Status      string    `json:"status"`
	ProcessedAt time.Time `json:"processedAt"`
	TraceID     string    `json:"traceId,omitempty"`
	SpanID      string    `json:"spanId,omitempty"`
}

type paymentEventJSON struct {
	PaymentID   string  `json:"paymentId"`
	OrderID     string  `json:"orderId"`
	Amount      float64 `json:"amount"`
	Status      string  `json:"status"`
	ProcessedAt string  `json:"processedAt"`
	TraceID     string  `json:"traceId,omitempty"`
	SpanID      string  `json:"spanId,omitempty"`
}

func (e *PaymentEvent) UnmarshalJSON(data []byte) error {
	var j paymentEventJSON
	if err := json.Unmarshal(data, &j); err != nil {
		return err
	}

	e.PaymentID = j.PaymentID
	e.OrderID = j.OrderID
	e.Amount = j.Amount
	e.Status = j.Status
	e.TraceID = j.TraceID
	e.SpanID = j.SpanID

	if j.ProcessedAt != "" {
		parsedTime, err := time.Parse(time.RFC3339, j.ProcessedAt)
		if err != nil {
			return fmt.Errorf("failed to parse processedAt: %w", err)
		}
		e.ProcessedAt = parsedTime
	}

	return nil
}

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
