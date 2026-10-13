import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import type { PatchSettingsRequest } from '../schemas/me.schemas.js';
import type { MeService } from '../services/me.service.js';

export class MeController {
  constructor(private readonly meService: MeService) {}

  get = async (_input: unknown, req: Request, res: Response): Promise<void> => {
    const { userId } = requireAuth(req);
    res.json(await this.meService.getMe(userId));
  };

  updateSettings = async (
    { body }: { body: PatchSettingsRequest },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.json(await this.meService.updateSettings(userId, body));
  };

  deleteAccount = async (_input: unknown, req: Request, res: Response): Promise<void> => {
    const { userId } = requireAuth(req);
    await this.meService.deleteAccount(userId);
    res.status(204).end();
  };
}
