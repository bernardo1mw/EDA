import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  environment: process.env.NODE_ENV || 'development',
  serviceName: 'payment-service',

  database: {
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'order_process',
  },

  rabbitmq: {
    host: process.env.RABBITMQ_HOST || 'rabbitmq',
    port: parseInt(process.env.RABBITMQ_PORT ?? '5672', 10),
    username: process.env.RABBITMQ_USERNAME || 'guest',
    password: process.env.RABBITMQ_PASSWORD || '',
    vhost: process.env.RABBITMQ_VHOST || '/',
  },

  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },

  observability: {
    elasticsearch: {
      host: process.env.ELASTICSEARCH_HOST || 'elasticsearch',
      port: parseInt(process.env.ELASTICSEARCH_PORT ?? '9200', 10),
    },
    jaeger: {
      endpoint: process.env.JAEGER_ENDPOINT || 'http://jaeger:14268/api/traces',
    },
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    apiVersion: '2023-10-16' as const,
  },
}));
