import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ObjectId } from 'mongodb';
import { UnauthorizedError } from '../errors/app-error.js';
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  parseCookies,
  SESSION_COOKIE_NAME,
} from '../http/cookies.js';
import type { UserView } from '../repositories/users.repository.js';
import type { AuthService, CurrentSession } from '../services/auth.service.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface AuthContext {
  user: UserView;
  userId: ObjectId;
  session: CurrentSession['session'];
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

export function requireAuth(req: Request): AuthContext {
  if (!req.auth) {
    throw new UnauthorizedError();
  }

  return req.auth;
}

export function createAuthMiddleware(authService: AuthService): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies.get(SESSION_COOKIE_NAME);
    const currentSession = await authService.getCurrentSession(sessionToken);

    if (!currentSession) {
      next(new UnauthorizedError());
      return;
    }

    if (UNSAFE_METHODS.has(req.method)) {
      authService.validateCsrf(
        currentSession.session,
        cookies.get(CSRF_COOKIE_NAME),
        req.get(CSRF_HEADER_NAME),
      );
    }

    req.auth = {
      user: currentSession.user,
      userId: currentSession.session.userId,
      session: currentSession.session,
    };
    next();
  };
}
