package testutil

import (
	"context"

	domain "github.com/bernardo1mw/EDA/services/go-shared/domain"
)

// MockOrderRepository can satisfy the domain.OrderRepository interface of both
// inventory-service and notification-service, since both use *shared.OrderDetails.
type MockOrderRepository struct {
	GetOrderDetailsFn func(ctx context.Context, orderID string) (*domain.OrderDetails, error)
}

func (m *MockOrderRepository) GetOrderDetails(ctx context.Context, orderID string) (*domain.OrderDetails, error) {
	return m.GetOrderDetailsFn(ctx, orderID)
}
