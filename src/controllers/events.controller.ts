import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import type {
  CreateEventRequest,
  EventsQuery,
  PatchEventRequest,
} from '../schemas/events.schemas.js';
import type { EventsService } from '../services/events.service.js';

export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  list = async ({ query }: { query: EventsQuery }, req: Request, res: Response): Promise<void> => {
    const { userId, user } = requireAuth(req);
    res.json(await this.eventsService.listInRange(userId, query, user.settings.timeZone));
  };

  create = async (
    { body }: { body: CreateEventRequest },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.status(201).json(await this.eventsService.create(userId, body));
  };

  update = async (
    { params, body }: { params: { id: string }; body: PatchEventRequest },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.json(await this.eventsService.update(userId, params.id, body));
  };

  remove = async (
    { params }: { params: { id: string } },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    await this.eventsService.remove(userId, params.id);
    res.status(204).end();
  };
}
