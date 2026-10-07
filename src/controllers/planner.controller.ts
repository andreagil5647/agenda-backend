import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import type { PlannerService } from '../services/planner.service.js';
import type { PatchSettingsRequest } from '../schemas/planner.schemas.js';

export class PlannerController {
  constructor(private readonly plannerService: PlannerService) {}

  getMe = async (_input: unknown, req: Request, res: Response): Promise<void> => {
    const { userId } = requireAuth(req);
    res.json(await this.plannerService.getMe(userId));
  };

  updateSettings = async (
    { body }: { body: PatchSettingsRequest },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.json(await this.plannerService.updateSettings(userId, body));
  };

  deleteAccount = async (_input: unknown, req: Request, res: Response): Promise<void> => {
    const { userId } = requireAuth(req);
    await this.plannerService.deleteAccount(userId);
    res.status(204).end();
  };
}
