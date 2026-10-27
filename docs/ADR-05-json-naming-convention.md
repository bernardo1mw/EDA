# ADR-05: JSON Naming Convention for Inter-Service Communication

## Status
Accepted

## Context
Services are written in Python (snake_case), Go, and TypeScript (camelCase). We need a consistent convention for messages on RabbitMQ.

## Decision
All messages on RabbitMQ use **snake_case** field names. Each service is responsible for converting to/from its internal convention at the boundary.

## Consequences
- Python services need no conversion (native snake_case)
- Go services use json struct tags with snake_case
- TypeScript services transform at consumer/publisher boundary
