package infrastructure

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	shared "github.com/bernardo1mw/EDA/services/go-shared/domain"
	"github.com/bernardo1mw/EDA/services/inventory-service/internal/domain"
	"github.com/google/uuid"
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

type postgresInventoryRepo struct {
	db *sql.DB
}

func NewInventoryRepository(db *sql.DB) domain.InventoryRepository {
	return &postgresInventoryRepo{db: db}
}

func (r *postgresInventoryRepo) CheckAndReserveStock(ctx context.Context, productID string, quantity int) (bool, error) {
	checkQuery := `
		SELECT stock_quantity
		FROM products
		WHERE id = $1
	`

	var currentStock int
	err := r.db.QueryRowContext(ctx, checkQuery, productID).Scan(&currentStock)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, fmt.Errorf("product not found: %s", productID)
		}
		return false, err
	}

	if currentStock < quantity {
		return false, nil
	}

	reserveQuery := `
		UPDATE products
		SET stock_quantity = stock_quantity - $2, updated_at = NOW()
		WHERE id = $1 AND stock_quantity >= $2
		RETURNING stock_quantity
	`

	var newStock int
	err = r.db.QueryRowContext(ctx, reserveQuery, productID, quantity).Scan(&newStock)
	if err != nil {
		if err == sql.ErrNoRows {
			// Stock was insufficient or changed between check and update
			return false, nil
		}
		return false, err
	}

	return true, nil
}

func (r *postgresInventoryRepo) StoreInventoryEvent(ctx context.Context, event domain.InventoryEvent) error {
	query := `
		INSERT INTO inventory_events (id, order_id, product_id, quantity, status, processed_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	eventID := uuid.New().String()
	_, err := r.db.ExecContext(ctx, query,
		eventID, event.OrderID, event.ProductID, event.Quantity,
		event.Status, event.ProcessedAt, time.Now())

	return err
}
