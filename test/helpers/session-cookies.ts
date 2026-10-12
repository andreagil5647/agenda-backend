import type request from 'supertest';
import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from '../../src/controllers/auth.controller.js';

function getSetCookies(res: request.Response): string[] {
  const header = res.headers['set-cookie'];
  if (Array.isArray(header)) return header;
  return typeof header === 'string' ? [header] : [];
}

function findSetCookie(res: request.Response, name: string): string {
  const cookie = getSetCookies(res).find((value) => value.startsWith(`${name}=`));
  if (!cookie) throw new Error(`Set-Cookie ${name} not found`);
  return cookie;
}

function cookiePair(setCookie: string, name: string): string {
  const pair = setCookie.split(';')[0];
  if (!pair?.startsWith(`${name}=`)) throw new Error(`Cookie ${name} not found`);
  return pair;
}

export function cookieHeader(res: request.Response): string {
  return [
    cookiePair(findSetCookie(res, SESSION_COOKIE_NAME), SESSION_COOKIE_NAME),
    cookiePair(findSetCookie(res, CSRF_COOKIE_NAME), CSRF_COOKIE_NAME),
  ].join('; ');
}
