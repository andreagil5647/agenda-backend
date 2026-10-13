import type { CookieOptions, Response } from 'express';

export const SESSION_COOKIE_NAME = 'agenda_session';
export const CSRF_COOKIE_NAME = 'agenda_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export interface SessionCookieValues {
  sessionToken: string;
  csrfToken: string;
  expiresAt: Date;
}

/** The session cookie is hidden from scripts; the CSRF cookie has to be readable by them. */
function cookieOptions(httpOnly: boolean, expiresAt?: Date): CookieOptions {
  return {
    httpOnly,
    secure: true,
    sameSite: 'lax',
    path: '/',
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

export function setSessionCookies(res: Response, session: SessionCookieValues): void {
  res.cookie(SESSION_COOKIE_NAME, session.sessionToken, cookieOptions(true, session.expiresAt));
  res.cookie(CSRF_COOKIE_NAME, session.csrfToken, cookieOptions(false, session.expiresAt));
}

export function clearSessionCookies(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions(true));
  res.clearCookie(CSRF_COOKIE_NAME, cookieOptions(false));
}

export function parseCookies(headerValue: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();

  for (const part of headerValue?.split(';') ?? []) {
    const [name, ...valueParts] = part.trim().split('=');
    if (!name || valueParts.length === 0) {
      continue;
    }

    cookies.set(name, decodeURIComponent(valueParts.join('=')));
  }

  return cookies;
}
