import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import type { PlannerService } from '../services/planner.service.js';
import type {
  CalendarOrderRequest,
  CreateCalendarRequest,
  PatchCalendarRequest,
  PatchSettingsRequest,
} from '../schemas/planner.schemas.js';

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

  listCalendars = async (_input: unknown, req: Request, res: Response): Promise<void> => {
    const { userId } = requireAuth(req);
    res.json(await this.plannerService.listCalendars(userId));
  };

  createCalendar = async (
    { body }: { body: CreateCalendarRequest },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.status(201).json(await this.plannerService.createCalendar(userId, body));
  };

  updateCalendar = async (
    { params, body }: { params: { id: string }; body: PatchCalendarRequest },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.json(await this.plannerService.updateCalendar(userId, params.id, body));
  };

  deleteCalendar = async (
    { params }: { params: { id: string } },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    await this.plannerService.deleteCalendar(userId, params.id);
    res.status(204).end();
  };

  reorderCalendars = async (
    { body }: { body: CalendarOrderRequest },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.json(await this.plannerService.reorderCalendars(userId, body));
  };
}
