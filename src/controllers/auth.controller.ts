import type { CookieOptions, Request, Response } from 'express';
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  parseCookies,
  SESSION_COOKIE_NAME,
} from '../http/cookies.js';
import type { AuthService, AuthSession, CurrentSession } from '../services/auth.service.js';
import type {
  AuthenticatedSessionResponse,
  LoginRequest,
  RegisterRequest,
  SessionResponse,
} from '../schemas/auth.schemas.js';

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, SESSION_COOKIE_NAME } from '../http/cookies.js';

function authCookieOptions(expiresAt?: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

function csrfCookieOptions(expiresAt?: Date): CookieOptions {
  return {
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    path: '/',
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

function sessionBody(
  session: AuthSession | CurrentSession,
  csrfToken: string,
): AuthenticatedSessionResponse {
  return {
    user: session.user,
    expiresAt: session.expiresAt.toISOString(),
    csrfToken,
  };
}

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (
    { body }: { body: RegisterRequest },
    _req: Request,
    res: Response,
  ): Promise<void> => {
    const session = await this.authService.register(body);
    this.setSessionCookies(res, session);
    res.status(201).json(sessionBody(session, session.csrfToken));
  };

  login = async ({ body }: { body: LoginRequest }, _req: Request, res: Response): Promise<void> => {
    const session = await this.authService.login(body);
    this.setSessionCookies(res, session);
    res.json(sessionBody(session, session.csrfToken));
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
    this.clearSessionCookies(res);
    res.status(204).end();
  };

  getSession = async (_input: unknown, req: Request, res: Response): Promise<void> => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies.get(SESSION_COOKIE_NAME);
    const currentSession = await this.authService.getCurrentSession(sessionToken);

    if (!currentSession) {
      if (sessionToken) {
        this.clearSessionCookies(res);
      }

      const body: SessionResponse = { user: null };
      res.json(body);
      return;
    }

    const body = sessionBody(currentSession, cookies.get(CSRF_COOKIE_NAME) ?? '');
    res.json(body);
  };

  private setSessionCookies(res: Response, session: AuthSession): void {
    res.cookie(SESSION_COOKIE_NAME, session.sessionToken, authCookieOptions(session.expiresAt));
    res.cookie(CSRF_COOKIE_NAME, session.csrfToken, csrfCookieOptions(session.expiresAt));
  }

  private clearSessionCookies(res: Response): void {
    res.clearCookie(SESSION_COOKIE_NAME, authCookieOptions());
    res.clearCookie(CSRF_COOKIE_NAME, csrfCookieOptions());
  }
}
