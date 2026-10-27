package domain

import (
	"context"

	shared "github.com/bernardo1mw/EDA/services/go-shared/domain"
)

type OrderRepository interface {
	GetOrderDetails(ctx context.Context, orderID string) (*shared.OrderDetails, error)
}

type NotificationRepository interface {
	StoreNotificationEvent(ctx context.Context, event NotificationEvent) error
}

type EventPublisher interface {
	PublishNotificationEvent(ctx context.Context, event NotificationEvent) error
}
