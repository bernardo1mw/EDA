package infra

import (
	"fmt"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

func ConnectRabbitMQ(url string) (*amqp.Connection, error) {
	var (
		conn *amqp.Connection
		err  error
	)
	for i := 1; i <= 5; i++ {
		conn, err = amqp.Dial(url)
		if err == nil {
			return conn, nil
		}
		log.Printf("Failed to connect to RabbitMQ (attempt %d/5): %v", i, err)
		time.Sleep(2 * time.Second)
	}
	return nil, fmt.Errorf("failed to connect to RabbitMQ after 5 attempts: %w", err)
}
