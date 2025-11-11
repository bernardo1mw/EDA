import { Provider } from '@nestjs/common';
import { StructuredLogger } from '../../core/logging';

export const sharedProviders: Provider[] = [
  StructuredLogger,
];
