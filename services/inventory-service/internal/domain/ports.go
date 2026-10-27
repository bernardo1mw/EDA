package domain

import (
	"context"

	shared "github.com/bernardo1mw/EDA/services/go-shared/domain"
)

type OrderRepository interface {
	GetOrderDetails(ctx context.Context, orderID string) (*shared.OrderDetails, error)
}

type InventoryRepository interface {
	CheckAndReserveStock(ctx context.Context, productID string, quantity int) (bool, error)
	StoreInventoryEvent(ctx context.Context, event InventoryEvent) error
}

type EventPublisher interface {
	PublishInventoryEvent(ctx context.Context, event InventoryEvent) error
}
