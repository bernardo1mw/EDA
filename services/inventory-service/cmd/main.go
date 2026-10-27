package main

import (
	"context"
	"fmt"
	"log"

	sharedconfig "github.com/bernardo1mw/EDA/services/go-shared/config"
	sharedinfra "github.com/bernardo1mw/EDA/services/go-shared/infra"
	"github.com/bernardo1mw/EDA/services/inventory-service/internal/application"
	"github.com/bernardo1mw/EDA/services/inventory-service/internal/infrastructure"
)

func main() {
	dbHost := sharedconfig.GetEnv("POSTGRES_HOST", "localhost")
	dbPort := sharedconfig.GetEnv("POSTGRES_PORT", "5432")
	dbUser := sharedconfig.GetEnv("POSTGRES_USER", "order_user")
	dbPassword := sharedconfig.GetEnv("POSTGRES_PASSWORD", "")
	dbName := sharedconfig.GetEnv("POSTGRES_DB", "order_process")

	rabbitmqHost := sharedconfig.GetEnv("RABBITMQ_HOST", "localhost")
	rabbitmqPort := sharedconfig.GetEnv("RABBITMQ_PORT", "5672")
	rabbitmqUser := sharedconfig.GetEnv("RABBITMQ_USER", "order_user")
	rabbitmqPassword := sharedconfig.GetEnv("RABBITMQ_PASSWORD", "")

	db, err := sharedinfra.ConnectPostgres(dbHost, dbPort, dbUser, dbPassword, dbName)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	rabbitmqURL := fmt.Sprintf("amqp://%s:%s@%s:%s/",
		rabbitmqUser, rabbitmqPassword, rabbitmqHost, rabbitmqPort)
	conn, err := sharedinfra.ConnectRabbitMQ(rabbitmqURL)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer conn.Close()

	channel, err := conn.Channel()
	if err != nil {
		log.Fatalf("Failed to open channel: %v", err)
	}

	tracer, shutdownTracer := sharedinfra.InitTracer("inventory-service")
	defer shutdownTracer(context.Background())

	sharedinfra.StartMetricsServer(":9090")

	orderRepo := infrastructure.NewOrderRepository(db)
	inventoryRepo := infrastructure.NewInventoryRepository(db)
	publisher := infrastructure.NewEventPublisher(channel)

	handler := application.NewHandler(orderRepo, inventoryRepo, publisher, tracer)
	consumer := infrastructure.NewConsumer(channel, handler.ProcessPaymentAuthorized, tracer)

	ctx := context.Background()
	if err := consumer.Start(ctx); err != nil {
		log.Fatalf("Inventory service failed: %v", err)
	}
}
