# Event Stream Orders - Kibana Dashboard Setup

## Overview
This directory contains Kibana dashboard configurations for monitoring the Event Stream Orders system.

## Files
- `dashboard.json` - Main performance dashboard configuration
- `README.md` - This file

## Setup Instructions

### 1. Import Dashboard
```bash
# Import the dashboard configuration
curl -X POST "localhost:5601/api/saved_objects/_import" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  --data-binary @dashboard.json
```

### 2. Configure Index Patterns
1. Go to Kibana → Stack Management → Index Patterns
2. Create index pattern: `order-process-logs-*`
3. Select `@timestamp` as the time field

### 3. Access Dashboard
1. Go to Kibana → Dashboard
2. Open "Event Stream Orders - Performance Dashboard"

## Dashboard Panels

### 1. Order Creation Rate
- **Metric**: Orders created per second
- **Threshold**: ≥ 2000 req/s (from PRD)
- **Data Source**: `service:orders-api AND operation:create_order`

### 2. Response Time Distribution  
- **Metric**: P50, P95, P99 response times
- **Threshold**: P99 ≤ 200ms (from PRD)
- **Data Source**: `service:orders-api AND operation:create_order`

### 3. Error Rate Over Time
- **Metric**: Error rate percentage
- **Threshold**: ≤ 0.1% (from PRD)
- **Data Source**: `level:error`

### 4. Service Health
- **Metric**: Service status and uptime
- **Data Source**: Health check endpoints

### 5. Queue Metrics
- **Metric**: RabbitMQ queue lengths and processing rates
- **Data Source**: RabbitMQ management API

### 6. Database Performance
- **Metric**: PostgreSQL query performance
- **Data Source**: PostgreSQL logs and metrics

## Custom Queries

### Order Processing Time
```json
{
  "query": {
    "bool": {
      "must": [
        {"term": {"service": "orders-api"}},
        {"term": {"operation": "create_order"}}
      ]
    }
  },
  "aggs": {
    "avg_processing_time": {
      "avg": {
        "field": "response_time_ms"
      }
    }
  }
}
```

### Error Analysis
```json
{
  "query": {
    "bool": {
      "must": [
        {"term": {"level": "error"}}
      ]
    }
  },
  "aggs": {
    "errors_by_service": {
      "terms": {
        "field": "service.keyword"
      }
    }
  }
}
```

### Throughput by Service
```json
{
  "query": {
    "bool": {
      "must": [
        {"exists": {"field": "operation"}}
      ]
    }
  },
  "aggs": {
    "throughput_by_service": {
      "terms": {
        "field": "service.keyword"
      },
      "aggs": {
        "avg_throughput": {
          "avg": {
            "field": "throughput"
          }
        }
      }
    }
  }
}
```

## Monitoring Alerts

### High Error Rate Alert
- **Condition**: Error rate > 0.1%
- **Action**: Send notification to team

### High Latency Alert  
- **Condition**: P99 latency > 200ms
- **Action**: Scale up services

### Low Throughput Alert
- **Condition**: Throughput < 2000 req/s
- **Action**: Check system health

## Troubleshooting

### No Data in Dashboard
1. Check if Logstash is running: `docker compose logs logstash`
2. Verify index pattern exists: `curl localhost:9200/_cat/indices`
3. Check log format matches expected structure

### Dashboard Not Loading
1. Verify Kibana is healthy: `curl localhost:5601/api/status`
2. Check Elasticsearch connection: `curl localhost:9200/_cluster/health`
3. Restart Kibana: `docker compose restart kibana`

### Performance Issues
1. Check Elasticsearch cluster health
2. Monitor disk usage
3. Adjust Logstash batch size
4. Optimize index mappings
