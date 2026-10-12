import type { Request, Response } from 'express';
import type { HealthService } from '../services/health.service.js';

export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  getLiveness = (_input: unknown, _req: Request, res: Response): void => {
    res.json(this.healthService.getLiveness());
  };

  getReadiness = async (_input: unknown, _req: Request, res: Response): Promise<void> => {
    const readiness = await this.healthService.getReadiness();
    res.status(readiness.status === 'ok' ? 200 : 503).json(readiness);
  };
}
