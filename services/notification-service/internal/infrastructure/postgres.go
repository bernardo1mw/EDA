package infrastructure

import (
	"context"
	"database/sql"
	"time"

	shared "github.com/bernardo1mw/EDA/services/go-shared/domain"
	"github.com/bernardo1mw/EDA/services/notification-service/internal/domain"
)

type postgresOrderRepo struct {
	db *sql.DB
}

func NewOrderRepository(db *sql.DB) domain.OrderRepository {
	return &postgresOrderRepo{db: db}
}

func (r *postgresOrderRepo) GetOrderDetails(ctx context.Context, orderID string) (*shared.OrderDetails, error) {
	query := `
		SELECT id, customer_id, product_id, quantity, total_amount, status
		FROM orders WHERE id = $1
	`

	var order shared.OrderDetails
	err := r.db.QueryRowContext(ctx, query, orderID).Scan(
		&order.ID, &order.CustomerID, &order.ProductID,
		&order.Quantity, &order.TotalAmount, &order.Status,
	)
	if err != nil {
		return nil, err
	}

	return &order, nil
}

type postgresNotificationRepo struct {
	db *sql.DB
}

func NewNotificationRepository(db *sql.DB) domain.NotificationRepository {
	return &postgresNotificationRepo{db: db}
}

func (r *postgresNotificationRepo) StoreNotificationEvent(ctx context.Context, event domain.NotificationEvent) error {
	query := `
		INSERT INTO notification_events (id, order_id, customer_id, notification_type, status, sent_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err := r.db.ExecContext(ctx, query,
		event.NotificationID, event.OrderID, event.CustomerID, event.NotificationType,
		event.Status, event.SentAt, time.Now())

	return err
}
