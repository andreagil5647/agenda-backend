import type { Request, Response } from 'express';
import { sendVersioned } from '../http/etag.js';
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
    sendVersioned(res, await this.calendarsService.create(userId, body), 201);
  };

  update = async (
    {
      params,
      body,
      expectedVersion,
    }: { params: { id: string }; body: PatchCalendarRequest; expectedVersion: number },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    sendVersioned(
      res,
      await this.calendarsService.update(userId, params.id, body, expectedVersion),
    );
  };

  remove = async (
    { params, expectedVersion }: { params: { id: string }; expectedVersion: number },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    await this.calendarsService.remove(userId, params.id, expectedVersion);
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
