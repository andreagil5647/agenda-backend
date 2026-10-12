import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import type {
  CreateTaskRequest,
  MoveTaskRequest,
  PatchTaskRequest,
  TasksQuery,
} from '../schemas/tasks.schemas.js';
import type { TasksService } from '../services/tasks.service.js';

export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  list = async ({ query }: { query: TasksQuery }, req: Request, res: Response): Promise<void> => {
    const { userId } = requireAuth(req);
    res.json(await this.tasksService.list(userId, query));
  };

  create = async (
    { body }: { body: CreateTaskRequest },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.status(201).json(await this.tasksService.create(userId, body));
  };

  update = async (
    { params, body }: { params: { id: string }; body: PatchTaskRequest },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.json(await this.tasksService.update(userId, params.id, body));
  };

  remove = async (
    { params }: { params: { id: string } },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    await this.tasksService.remove(userId, params.id);
    res.status(204).end();
  };

  restore = async (
    { params }: { params: { id: string } },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.status(201).json(await this.tasksService.restore(userId, params.id));
  };

  move = async (
    { params, body }: { params: { id: string }; body: MoveTaskRequest },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    res.json(await this.tasksService.move(userId, params.id, body));
  };
}
