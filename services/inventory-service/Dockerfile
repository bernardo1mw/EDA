FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go-shared/ /app/go-shared/
COPY inventory-service/ /app/inventory-service/
WORKDIR /app/inventory-service
RUN go mod download && CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/inventory-service/main .
CMD ["./main"]
