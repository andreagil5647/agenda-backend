import type { Request, Response } from 'express';
import {
  clearSessionCookies,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  parseCookies,
  SESSION_COOKIE_NAME,
  setSessionCookies,
} from '../http/cookies.js';
import { toSessionView } from '../mappers/session.mapper.js';
import type { LoginRequest, RegisterRequest, SessionResponse } from '../schemas/auth.schemas.js';
import type { AuthService } from '../services/auth.service.js';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (
    { body }: { body: RegisterRequest },
    _req: Request,
    res: Response,
  ): Promise<void> => {
    const session = await this.authService.register(body);
    setSessionCookies(res, session);
    res.status(201).json(toSessionView(session, session.csrfToken));
  };

  login = async ({ body }: { body: LoginRequest }, _req: Request, res: Response): Promise<void> => {
    const session = await this.authService.login(body);
    setSessionCookies(res, session);
    res.json(toSessionView(session, session.csrfToken));
  };

  logout = async (_input: unknown, req: Request, res: Response): Promise<void> => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies.get(SESSION_COOKIE_NAME);
    const currentSession = await this.authService.getCurrentSession(sessionToken);

    if (currentSession) {
      this.authService.validateCsrf(
        currentSession.session,
        cookies.get(CSRF_COOKIE_NAME),
        req.get(CSRF_HEADER_NAME),
      );
    }

    await this.authService.logout(sessionToken);
    clearSessionCookies(res);
    res.status(204).end();
  };

  getSession = async (_input: unknown, req: Request, res: Response): Promise<void> => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies.get(SESSION_COOKIE_NAME);
    const currentSession = await this.authService.getCurrentSession(sessionToken);

    if (!currentSession) {
      if (sessionToken) {
        clearSessionCookies(res);
      }

      const body: SessionResponse = { user: null };
      res.json(body);
      return;
    }

    res.json(toSessionView(currentSession, cookies.get(CSRF_COOKIE_NAME) ?? ''));
  };
}
