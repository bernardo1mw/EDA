FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go-shared/ /app/go-shared/
COPY outbox-dispatcher/ /app/outbox-dispatcher/
WORKDIR /app/outbox-dispatcher
RUN go mod download && CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/outbox-dispatcher/main .
CMD ["./main"]
