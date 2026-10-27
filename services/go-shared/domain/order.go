package domain

type OrderDetails struct {
	ID          string
	CustomerID  string
	ProductID   string
	Quantity    int
	TotalAmount float64
	Status      string
}
