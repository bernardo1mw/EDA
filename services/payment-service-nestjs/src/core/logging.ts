import { Logger, LoggerService } from '@nestjs/common';

export class StructuredLogger implements LoggerService {
  private readonly logger: Logger;

  constructor(context?: string) {
    this.logger = new Logger(context ?? 'PaymentService');
  }

  log(message: string, context?: string): void {
    this.info(message, context ? { context } : undefined);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.logger.log(JSON.stringify({ message, ...data, timestamp: new Date().toISOString() }));
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(
      JSON.stringify({ message, trace, context, timestamp: new Date().toISOString() }),
    );
  }

  warn(message: string, context?: string): void {
    this.logger.warn(JSON.stringify({ message, context, timestamp: new Date().toISOString() }));
  }

  debug(message: string, context?: string): void {
    this.logger.debug(JSON.stringify({ message, context, timestamp: new Date().toISOString() }));
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(JSON.stringify({ message, context, timestamp: new Date().toISOString() }));
  }
}
