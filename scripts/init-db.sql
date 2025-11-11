-- Event Stream Orders Database Schema
-- PostgreSQL initialization script
-- 
-- NOTA: Este script é executado automaticamente pelo Docker quando o container é criado pela primeira vez
-- O Docker já conecta ao banco de dados correto antes de executar este script
-- Se executar manualmente, certifique-se de estar conectado ao banco 'order_process'

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    sku VARCHAR(100) UNIQUE,
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Outbox table for Transactional Outbox Pattern
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_id UUID NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3
);

-- Payment events table
CREATE TABLE payment_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    payment_id VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    trace_id VARCHAR(255),
    span_id VARCHAR(255),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory events table
CREATE TABLE inventory_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    product_id VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification events table
CREATE TABLE notification_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    customer_id VARCHAR(255) NOT NULL,
    notification_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aggregated metrics table
CREATE TABLE order_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    avg_processing_time_seconds DECIMAL(10,3) DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date)
);

-- Indexes for performance
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_created_at ON customers(created_at);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_created_at ON products(created_at);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

CREATE INDEX idx_outbox_events_status ON outbox_events(status);
CREATE INDEX idx_outbox_events_created_at ON outbox_events(created_at);
CREATE INDEX idx_outbox_events_aggregate_id ON outbox_events(aggregate_id);

CREATE INDEX idx_payment_events_order_id ON payment_events(order_id);
CREATE INDEX idx_payment_events_status ON payment_events(status);

CREATE INDEX idx_inventory_events_order_id ON inventory_events(order_id);
CREATE INDEX idx_inventory_events_status ON inventory_events(status);

CREATE INDEX idx_notification_events_order_id ON notification_events(order_id);
CREATE INDEX idx_notification_events_status ON notification_events(status);

CREATE INDEX idx_order_metrics_date ON order_metrics(date);

-- ============================================
-- OTIMIZAÇÕES DE PERFORMANCE PARA ALTA CARGA
-- ============================================
-- Índices compostos otimizados para queries frequentes e críticas

-- 1. Índice composto para listagem de orders por customer com ordenação por data
--    Otimiza: SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC
CREATE INDEX idx_orders_customer_created_at 
ON orders(customer_id, created_at DESC);

-- 2. Índice parcial para orders pendentes (mais consultadas)
--    Reduz tamanho do índice e melhora performance para queries filtradas
CREATE INDEX idx_orders_status_pending 
ON orders(status) 
WHERE status = 'PENDING';

-- 3. Índice para busca por customer e status (queries combinadas)
CREATE INDEX idx_orders_customer_status 
ON orders(customer_id, status);

-- 4. Índice composto OTIMIZADO para queries do Outbox Pattern (CRÍTICO)
--    Otimiza: SELECT * FROM outbox_events WHERE status = 'PENDING' ORDER BY created_at ASC
--    Este é o query mais crítico para o outbox-dispatcher service
--    Índice parcial reduz tamanho e melhora performance significativamente
CREATE INDEX idx_outbox_events_status_created_at 
ON outbox_events(status, created_at ASC) 
WHERE status = 'PENDING';

-- 5. Índice para busca rápida de eventos por aggregate_id e status (para correlação)
CREATE INDEX idx_outbox_events_aggregate_id_status
ON outbox_events(aggregate_id, status);

-- 6. Índice composto para orders com status e data (para relatórios e métricas)
CREATE INDEX idx_orders_status_created_at
ON orders(status, created_at DESC);

-- Comentários explicativos sobre os índices otimizados
COMMENT ON INDEX idx_orders_customer_created_at IS 
'Otimiza queries de listagem de orders por customer ordenadas por data - reduz tempo de query de O(n log n) para O(log n)';

COMMENT ON INDEX idx_orders_status_pending IS 
'Otimiza queries que filtram orders pendentes - índice parcial reduz tamanho e melhora performance';

COMMENT ON INDEX idx_orders_customer_status IS 
'Otimiza queries que combinam filtros de customer e status - reduz necessidade de múltiplas passadas';

COMMENT ON INDEX idx_outbox_events_status_created_at IS 
'Índice CRÍTICO para queries do Outbox Pattern - otimiza busca de eventos pendentes ordenados por data - essencial para outbox-dispatcher';

COMMENT ON INDEX idx_outbox_events_aggregate_id_status IS 
'Otimiza busca de eventos por aggregate_id e status - usado para correlação e queries relacionadas';

COMMENT ON INDEX idx_orders_status_created_at IS 
'Otimiza queries de relatórios e métricas que filtram por status e ordenam por data';

-- Atualizar estatísticas do query planner para otimizar execução de queries
-- Isso ajuda o PostgreSQL a escolher os melhores planos de execução
ANALYZE customers;
ANALYZE products;
ANALYZE orders;
ANALYZE outbox_events;
ANALYZE payment_events;
ANALYZE inventory_events;
ANALYZE notification_events;
ANALYZE order_metrics;

-- Configurar autovacuum para alta carga
-- Reduz thresholds para que autovacuum execute mais frequentemente sob carga
-- Isso mantém estatísticas atualizadas e reduz bloat
ALTER TABLE orders SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE orders SET (autovacuum_analyze_scale_factor = 0.05);

ALTER TABLE customers SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE customers SET (autovacuum_analyze_scale_factor = 0.05);

ALTER TABLE products SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE products SET (autovacuum_analyze_scale_factor = 0.05);

ALTER TABLE outbox_events SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE outbox_events SET (autovacuum_analyze_scale_factor = 0.05);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_metrics_updated_at BEFORE UPDATE ON order_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing (removed - will be created via API)

-- Create a view for order processing statistics
CREATE VIEW order_processing_stats AS
SELECT 
    DATE(created_at) as processing_date,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_orders,
    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_orders,
    ROUND(
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(*), 2
    ) as success_rate,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time_seconds
FROM orders
GROUP BY DATE(created_at)
ORDER BY processing_date DESC;

