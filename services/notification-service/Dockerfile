FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go-shared/ /app/go-shared/
COPY notification-service/ /app/notification-service/
WORKDIR /app/notification-service
RUN go mod download && CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/notification-service/main .
CMD ["./main"]
