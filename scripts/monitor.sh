#!/bin/bash

# Event Stream Orders - System Monitor
# This script monitors system health and performance metrics

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="http://localhost:8080"
AGGREGATOR_URL="http://localhost:8081"
KIBANA_URL="http://localhost:5601"
ELASTICSEARCH_URL="http://localhost:9200"

echo -e "${BLUE}🔍 Event Stream Orders - System Monitor${NC}"
echo "=========================================="
echo ""

# Function to check service health
check_service_health() {
    local service_name=$1
    local url=$2
    
    echo -e "${YELLOW}Checking $service_name...${NC}"
    
    if curl -s -f "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $service_name is healthy${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name is unhealthy${NC}"
        return 1
    fi
}

# Function to get metric value
get_metric() {
    local metric_name=$1
    local query=$2
    
    curl -s "$ELASTICSEARCH_URL/order-process-logs-*/_search" \
        -H "Content-Type: application/json" \
        -d "{\"query\":$query,\"size\":0,\"aggs\":{\"metric\":{\"avg\":{\"field\":\"$metric_name\"}}}}" \
        | jq -r '.aggregations.metric.value // "N/A"'
}

# Function to check queue status
check_queue_status() {
    echo -e "${YELLOW}Checking RabbitMQ queues...${NC}"
    
    # Get queue information
    local queues=$(docker compose exec -T rabbitmq rabbitmqctl list_queues name messages consumers 2>/dev/null || echo "Error")
    
    if [[ "$queues" == *"Error"* ]]; then
        echo -e "${RED}❌ Cannot connect to RabbitMQ${NC}"
        return 1
    fi
    
    echo "$queues" | while read -r line; do
        if [[ "$line" == *"order.created"* ]] || [[ "$line" == *"payment.authorized"* ]]; then
            local queue_name=$(echo "$line" | awk '{print $1}')
            local messages=$(echo "$line" | awk '{print $2}')
            local consumers=$(echo "$line" | awk '{print $3}')
            
            if [[ "$messages" -gt 1000 ]]; then
                echo -e "${RED}⚠️  Queue $queue_name has $messages messages (high)${NC}"
            elif [[ "$messages" -gt 100 ]]; then
                echo -e "${YELLOW}⚠️  Queue $queue_name has $messages messages (medium)${NC}"
            else
                echo -e "${GREEN}✅ Queue $queue_name has $messages messages${NC}"
            fi
            
            if [[ "$consumers" -eq 0 ]]; then
                echo -e "${RED}❌ Queue $queue_name has no consumers${NC}"
            else
                echo -e "${GREEN}✅ Queue $queue_name has $consumers consumers${NC}"
            fi
        fi
    done
}

# Function to check database status
check_database_status() {
    echo -e "${YELLOW}Checking PostgreSQL status...${NC}"
    
    # Check connection count
    local connections=$(docker compose exec -T postgres psql -U order_user -d order_process -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null || echo "Error")
    
    if [[ "$connections" == *"Error"* ]]; then
        echo -e "${RED}❌ Cannot connect to PostgreSQL${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ PostgreSQL has $connections active connections${NC}"
    
    # Check recent orders
    local recent_orders=$(docker compose exec -T postgres psql -U order_user -d order_process -t -c "SELECT count(*) FROM orders WHERE created_at > NOW() - INTERVAL '1 hour';" 2>/dev/null || echo "0")
    echo -e "${BLUE}📊 Orders created in last hour: $recent_orders${NC}"
    
    # Check outbox events
    local pending_events=$(docker compose exec -T postgres psql -U order_user -d order_process -t -c "SELECT count(*) FROM outbox_events WHERE status = 'PENDING';" 2>/dev/null || echo "0")
    if [[ "$pending_events" -gt 10 ]]; then
        echo -e "${RED}⚠️  $pending_events pending outbox events${NC}"
    else
        echo -e "${GREEN}✅ $pending_events pending outbox events${NC}"
    fi
}

# Function to check system resources
check_system_resources() {
    echo -e "${YELLOW}Checking system resources...${NC}"
    
    # Get Docker stats
    local stats=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep order_process || echo "No containers found")
    
    if [[ "$stats" == *"No containers found"* ]]; then
        echo -e "${RED}❌ No order_process containers found${NC}"
        return 1
    fi
    
    echo "$stats" | while read -r line; do
        if [[ "$line" == *"order_process"* ]]; then
            local container=$(echo "$line" | awk '{print $1}')
            local cpu=$(echo "$line" | awk '{print $2}')
            local memory=$(echo "$line" | awk '{print $3}')
            
            echo -e "${BLUE}📊 $container: CPU $cpu, Memory $memory${NC}"
        fi
    done
}

# Function to run performance test
run_performance_test() {
    echo -e "${YELLOW}Running quick performance test...${NC}"
    
    # Check if k6 is available
    if ! command -v k6 &> /dev/null; then
        echo -e "${RED}❌ k6 is not installed. Skipping performance test.${NC}"
        return 1
    fi
    
    # Create a simple test
    cat > /tmp/quick_test.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function() {
  const order = {
    customer_id: 'customer-test',
    product_id: 'product-test',
    quantity: 1,
    total_amount: 99.99
  };
  
  const response = http.post('http://localhost:8080/orders', JSON.stringify(order), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(response, {
    'status is 201': (r) => r.status === 201,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
EOF
    
    echo -e "${BLUE}Running 30-second performance test...${NC}"
    if k6 run /tmp/quick_test.js; then
        echo -e "${GREEN}✅ Performance test passed${NC}"
    else
        echo -e "${RED}❌ Performance test failed${NC}"
    fi
    
    rm -f /tmp/quick_test.js
}

# Main monitoring function
main() {
    echo -e "${BLUE}🕐 $(date)${NC}"
    echo ""
    
    # Check service health
    echo -e "${YELLOW}🏥 Service Health Check${NC}"
    echo "-------------------"
    check_service_health "Orders API" "$API_BASE_URL/health"
    check_service_health "Elasticsearch" "$ELASTICSEARCH_URL/_cluster/health"
    check_service_health "Kibana" "$KIBANA_URL/api/status"
    echo ""
    
    # Check queue status
    echo -e "${YELLOW}📬 Queue Status${NC}"
    echo "-------------"
    check_queue_status
    echo ""
    
    # Check database status
    echo -e "${YELLOW}🗄️  Database Status${NC}"
    echo "----------------"
    check_database_status
    echo ""
    
    # Check system resources
    echo -e "${YELLOW}💻 System Resources${NC}"
    echo "------------------"
    check_system_resources
    echo ""
    
    # Run performance test
    echo -e "${YELLOW}⚡ Performance Test${NC}"
    echo "------------------"
    run_performance_test
    echo ""
    
    echo -e "${GREEN}🎉 System monitoring completed!${NC}"
    echo ""
    echo -e "${BLUE}📊 For detailed metrics, check:${NC}"
    echo -e "   • Kibana Dashboard: $KIBANA_URL"
    echo -e "   • RabbitMQ Management: http://localhost:15672"
    echo -e "   • System Logs: docker compose logs -f"
}

# Run monitoring
main "$@"
