import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import type { PlannerService } from '../services/planner.service.js';
import type {
  CalendarOrderRequest,
  CreateCalendarRequest,
  CreateEventRequest,
  CreateTaskRequest,
  EventsQuery,
  MoveTaskRequest,
  PatchCalendarRequest,
  PatchEventRequest,
  PatchSettingsRequest,
  PatchTaskRequest,
  TasksQuery,
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

  listTasks = async (
    { query }: { query: TasksQuery },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.json(await this.plannerService.listTasks(userId, query));
  };

  createTask = async (
    { body }: { body: CreateTaskRequest },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.status(201).json(await this.plannerService.createTask(userId, body));
  };

  updateTask = async (
    { params, body }: { params: { id: string }; body: PatchTaskRequest },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.json(await this.plannerService.updateTask(userId, params.id, body));
  };

  deleteTask = async (
    { params }: { params: { id: string } },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    await this.plannerService.deleteTask(userId, params.id);
    res.status(204).end();
  };

  restoreTask = async (
    { params }: { params: { id: string } },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.status(201).json(await this.plannerService.restoreTask(userId, params.id));
  };

  moveTask = async (
    { params, body }: { params: { id: string }; body: MoveTaskRequest },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.json(await this.plannerService.moveTask(userId, params.id, body));
  };

  listEvents = async (
    { query }: { query: EventsQuery },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.json(await this.plannerService.listEvents(userId, query));
  };

  createEvent = async (
    { body }: { body: CreateEventRequest },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.status(201).json(await this.plannerService.createEvent(userId, body));
  };

  updateEvent = async (
    { params, body }: { params: { id: string }; body: PatchEventRequest },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.json(await this.plannerService.updateEvent(userId, params.id, body));
  };

  deleteEvent = async (
    { params }: { params: { id: string } },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    await this.plannerService.deleteEvent(userId, params.id);
    res.status(204).end();
  };
}
