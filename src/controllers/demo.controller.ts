import type { Request, Response } from 'express';
import { setSessionCookies } from '../http/cookies.js';
import { toSessionView } from '../mappers/session.mapper.js';
import type { DemoService } from '../services/demo.service.js';

export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  start = async (_input: unknown, _req: Request, res: Response): Promise<void> => {
    const session = await this.demoService.createDemoSession();
    setSessionCookies(res, session);
    res.status(201).json(toSessionView(session, session.csrfToken));
  };
}
