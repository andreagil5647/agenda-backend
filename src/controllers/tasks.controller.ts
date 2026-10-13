import type { Request, Response } from 'express';
import { sendVersioned } from '../http/etag.js';
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
    sendVersioned(res, await this.tasksService.create(userId, body), 201);
  };

  update = async (
    {
      params,
      body,
      expectedVersion,
    }: { params: { id: string }; body: PatchTaskRequest; expectedVersion: number },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    sendVersioned(res, await this.tasksService.update(userId, params.id, body, expectedVersion));
  };

  remove = async (
    { params, expectedVersion }: { params: { id: string }; expectedVersion: number },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    await this.tasksService.remove(userId, params.id, expectedVersion);
    res.status(204).end();
  };

  restore = async (
    { params }: { params: { id: string } },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    sendVersioned(res, await this.tasksService.restore(userId, params.id), 201);
  };

  move = async (
    {
      params,
      body,
      expectedVersion,
    }: { params: { id: string }; body: MoveTaskRequest; expectedVersion: number },
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    sendVersioned(res, await this.tasksService.move(userId, params.id, body, expectedVersion));
  };
}
