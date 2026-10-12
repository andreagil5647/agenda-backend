import type { Request, Response } from 'express';
import { sendVersioned } from '../http/etag.js';
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
    sendVersioned(res, await this.eventsService.create(userId, body), 201);
  };

  update = async (
    {
      params,
      body,
      expectedVersion,
    }: { params: { id: string }; body: PatchEventRequest; expectedVersion: number },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    sendVersioned(res, await this.eventsService.update(userId, params.id, body, expectedVersion));
  };

  remove = async (
    { params, expectedVersion }: { params: { id: string }; expectedVersion: number },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    await this.eventsService.remove(userId, params.id, expectedVersion);
    res.status(204).end();
  };
}
