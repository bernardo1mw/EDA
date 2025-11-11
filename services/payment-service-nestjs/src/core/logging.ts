import { LoggerService } from '@nestjs/common';

export class StructuredLogger implements LoggerService {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  log(message: string, context?: string) {
    this.print('info', message, context);
  }

  error(message: string, trace?: string, context?: string) {
    this.print('error', message, context, { trace });
  }

  warn(message: string, context?: string) {
    this.print('warn', message, context);
  }

  debug(message: string, context?: string) {
    this.print('debug', message, context);
  }

  verbose(message: string, context?: string) {
    this.print('verbose', message, context);
  }

  private print(level: string, message: string, context?: string, extra?: any) {
    const logContext = context || this.context || 'PaymentService';
    const timestamp = new Date().toISOString();
    
    const logEntry = {
      timestamp,
      level,
      message,
      service: 'payment-service',
      context: logContext,
      ...extra,
    };

    console.log(JSON.stringify(logEntry));
  }
}

