import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { getMetrics, getContentType } from '@/core/metrics';

@Controller('metrics')
export class MetricsController {
  @Get()
  async metrics(@Res() res: Response): Promise<void> {
    res.set('Content-Type', getContentType());
    res.end(await getMetrics());
  }
}
