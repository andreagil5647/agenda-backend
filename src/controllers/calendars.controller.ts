import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import type {
  CalendarOrderRequest,
  CreateCalendarRequest,
  PatchCalendarRequest,
} from '../schemas/calendars.schemas.js';
import type { CalendarsService } from '../services/calendars.service.js';

export class CalendarsController {
  constructor(private readonly calendarsService: CalendarsService) {}

  list = async (_input: unknown, req: Request, res: Response): Promise<void> => {
    const { userId } = requireAuth(req);
    res.json(await this.calendarsService.list(userId));
  };

  create = async (
    { body }: { body: CreateCalendarRequest },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.status(201).json(await this.calendarsService.create(userId, body));
  };

  update = async (
    { params, body }: { params: { id: string }; body: PatchCalendarRequest },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.json(await this.calendarsService.update(userId, params.id, body));
  };

  remove = async (
    { params }: { params: { id: string } },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    await this.calendarsService.remove(userId, params.id);
    res.status(204).end();
  };

  reorder = async (
    { body }: { body: CalendarOrderRequest },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.json(await this.calendarsService.reorder(userId, body));
  };
}
